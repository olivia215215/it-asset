FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm ci && npm run build

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
