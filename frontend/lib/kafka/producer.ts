import { Kafka } from 'kafkajs'

const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:19092'
const kafka = new Kafka({ brokers: KAFKA_BROKERS.split(',') })
const producer = kafka.producer()

export async function produceTicketingRequest(data: {
    userId: string
    eventId: string
    requestId: string
}) {
    await producer.send({
        topic: 'ticketing-requests',
        messages: [{ value: JSON.stringify(data) }],
    })

}