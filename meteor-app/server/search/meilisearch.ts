/**
 * Minimal Meilisearch HTTP client for the derived inventory index.
 * Raw HTTP keeps the boundary compatible with Meteor's current Node runtime and
 * avoids coupling inventory persistence to a vendor client package.
 */
import { InventorySearchUnavailableError } from '/imports/search/InventorySearchProvider';

export interface SearchDocument {
    id: string;
    name: string;
    description: string;
    aliases: string[];
    vocabulary_en: string[];
    vocabulary_zh: string[];
    vocabulary_ja: string[];
    metadata: string[];
    modifiedAt: string;
}

export interface SearchHit {
    id: string;
    score: number;
    matchedFields: string[];
}

export interface SearchPage {
    hits: SearchHit[];
    estimatedTotalHits: number;
}

export interface SearchClientConfig {
    url: string;
    apiKey: string;
    index: string;
    timeoutMs?: number;
}

interface TaskResponse {
    taskUid: number;
}

interface TaskStatus {
    status: 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled';
    error?: unknown;
}

type Fetch = typeof fetch;

const INDEX_SETTINGS = {
    searchableAttributes: [
        'id',
        'name',
        'description',
        'aliases',
        'vocabulary_en',
        'vocabulary_zh',
        'vocabulary_ja',
        'metadata',
    ],
    localizedAttributes: [
        { attributePatterns: ['name', 'description', 'aliases', 'metadata', 'vocabulary_en'], locales: ['eng'] },
        { attributePatterns: ['vocabulary_zh'], locales: ['zho'] },
        { attributePatterns: ['vocabulary_ja'], locales: ['jpn'] },
    ],
    typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 },
        disableOnAttributes: ['id', 'vocabulary_zh', 'vocabulary_ja'],
        disableOnNumbers: true,
    },
    sortableAttributes: ['id'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness', 'sort'],
};

const SEARCH_RESULT_ATTRIBUTES = [
    'id',
    'name',
    'description',
    'aliases',
    'vocabulary_en',
    'vocabulary_zh',
    'vocabulary_ja',
    'metadata',
];

const DEFAULT_TIMEOUT_MS = 5_000;
const TASK_POLL_INTERVAL_MS = 25;

const matchedFields = (formatted: Record<string, unknown> | undefined): string[] =>
    Object.entries(formatted ?? {})
        .filter(([, value]) => JSON.stringify(value).includes('<em>'))
        .map(([field]) => field);

export class MeilisearchInventoryClient {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;

    constructor(private readonly config: SearchClientConfig, private readonly fetchImpl: Fetch = fetch) {
        this.baseUrl = config.url.replace(/\/$/u, '');
        this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    }

    private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
        try {
            const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
                ...init,
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    ...init.headers,
                },
                signal: AbortSignal.timeout(this.timeoutMs),
            });
            const text = await response.text();
            if (!response.ok) {
                throw new InventorySearchUnavailableError(
                    `Search service returned ${response.status}${text === '' ? '' : `: ${text}`}`
                );
            }
            return (text === '' ? undefined : JSON.parse(text)) as T;
        } catch (error) {
            if (error instanceof InventorySearchUnavailableError) throw error;
            throw new InventorySearchUnavailableError('Search service is unavailable', { cause: error });
        }
    }

    private async waitForTask(taskUid: number): Promise<void> {
        const deadline = Date.now() + this.timeoutMs;
        while (Date.now() < deadline) {
            const task = await this.request<TaskStatus>(`/tasks/${taskUid}`);
            if (task.status === 'succeeded') return;
            if (task.status === 'failed' || task.status === 'canceled') {
                throw new InventorySearchUnavailableError(
                    `Search indexing task ${task.status}: ${JSON.stringify(task.error)}`
                );
            }
            await new Promise((resolve) => setTimeout(resolve, TASK_POLL_INTERVAL_MS));
        }
        throw new InventorySearchUnavailableError('Search indexing task timed out');
    }

    private async runTask(path: string, method: string, body?: unknown): Promise<void> {
        const task = await this.request<TaskResponse>(path, {
            method,
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        await this.waitForTask(task.taskUid);
    }

    async health(): Promise<void> {
        const health = await this.request<{ status: string }>('/health');
        if (health.status !== 'available') throw new InventorySearchUnavailableError('Search service is unhealthy');
    }

    private async indexExists(index: string): Promise<boolean> {
        try {
            await this.request(`/indexes/${encodeURIComponent(index)}`);
            return true;
        } catch (error) {
            if (error instanceof InventorySearchUnavailableError && error.message.includes('404')) return false;
            throw error;
        }
    }

    private async createIndex(index: string): Promise<void> {
        await this.runTask('/indexes', 'POST', { uid: index, primaryKey: 'id' });
        await this.runTask(`/indexes/${encodeURIComponent(index)}/settings`, 'PATCH', INDEX_SETTINGS);
    }

    async rebuild(documents: SearchDocument[]): Promise<void> {
        await this.health();
        if (!(await this.indexExists(this.config.index))) await this.createIndex(this.config.index);
        const temporary = `${this.config.index}_rebuild_${Date.now()}`;
        try {
            await this.createIndex(temporary);
            if (documents.length > 0) {
                await this.runTask(`/indexes/${encodeURIComponent(temporary)}/documents`, 'POST', documents);
            }
            await this.runTask('/swap-indexes', 'POST', [{ indexes: [this.config.index, temporary] }]);
            await this.runTask(`/indexes/${encodeURIComponent(temporary)}`, 'DELETE');
        } catch (error) {
            if (await this.indexExists(temporary))
                await this.runTask(`/indexes/${encodeURIComponent(temporary)}`, 'DELETE');
            throw error;
        }
    }

    async upsert(document: SearchDocument): Promise<void> {
        await this.runTask(`/indexes/${encodeURIComponent(this.config.index)}/documents`, 'POST', [document]);
    }

    async delete(id: string): Promise<void> {
        await this.runTask(
            `/indexes/${encodeURIComponent(this.config.index)}/documents/${encodeURIComponent(id)}`,
            'DELETE'
        );
    }

    async search(query: string, offset: number, limit: number): Promise<SearchPage> {
        const result = await this.request<{
            hits: Array<{ id: string; _rankingScore: number; _formatted?: Record<string, unknown> }>;
            estimatedTotalHits: number;
        }>(`/indexes/${encodeURIComponent(this.config.index)}/search`, {
            method: 'POST',
            body: JSON.stringify({
                q: query,
                offset,
                limit,
                matchingStrategy: 'all',
                // Highlighted fields are returned only when they are retrieved.
                // The application discards their values after deriving match evidence.
                attributesToRetrieve: SEARCH_RESULT_ATTRIBUTES,
                attributesToHighlight: ['*'],
                showRankingScore: true,
                sort: ['id:asc'],
            }),
        });
        return {
            estimatedTotalHits: result.estimatedTotalHits,
            hits: result.hits.map((hit) => {
                const score = Reflect.get(hit, '_rankingScore');
                const formatted = Reflect.get(hit, '_formatted');
                return {
                    id: hit.id,
                    score,
                    matchedFields: matchedFields(formatted),
                };
            }),
        };
    }
}
