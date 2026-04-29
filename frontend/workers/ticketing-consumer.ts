import { Kafka } from 'kafkajs'

const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:19092'
const kafka = new Kafka({ brokers: KAFKA_BROKERS.split(',') })
const consumer = kafka.consumer({ groupId: 'ticketing-group' })

await consumer.subscribe({ topic: 'ticketing-requests' })
await consumer.run({
    eachMessage: async ({ message }) => {
        const payload = JSON.parse(message?.value?.toString() || '{}') as {
            userId?: string
            eventId?: string
            requestId?: string
        }

        void payload
        // Redis에서 재고 확인 → DB 저장 → WebSocket 알림
    },
})
