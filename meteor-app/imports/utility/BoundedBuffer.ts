export class BoundedBuffer<T> {
    private items: T[] = [];
    private readonly maxEntries: number;

    constructor(maxEntries: number) {
        this.maxEntries = maxEntries;
    }

    push(item: T): void {
        this.items.push(item);
        if (this.items.length > this.maxEntries) {
            this.items.shift();
        }
    }

    get(): T[] {
        return [...this.items];
    }

    clear(): void {
        this.items = [];
    }
}
