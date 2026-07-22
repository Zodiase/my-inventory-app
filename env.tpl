MONGO_USERNAME={{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/username }}
MONGO_PASSWORD={{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/password }}
MONGO_ADMIN_PORT={{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/mongo-express-port }}
MONGO_EXPRESS_USERNAME=mongo-explorer
MONGO_EXPRESS_PASSWORD='{{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/mongo-express-browser-password }}'
MONGO_EXPRESS_DB_USERNAME=inventory-explorer
MONGO_EXPRESS_DB_PASSWORD='{{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/mongo-express-database-password }}'
NAS_MONGO_URL=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@{{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/mongo-host-and-port }}/inventory-app?&authSource=admin
