MONGO_USERNAME={{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/username }}
MONGO_PASSWORD={{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/password }}
MONGO_ADMIN_PORT={{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/mongo-express-port }}
MONGO_URL=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@{{ op://h6tlihxwgcjiljrwd52ifhxkki/n77bpzv66binxguygdq75jdxua/mongo-host-and-port }}/inventory-app?&authSource=admin
