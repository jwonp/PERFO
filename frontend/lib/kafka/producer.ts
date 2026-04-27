import { Kafka } from 'kafkajs'
import { KAFKA_BROKERS, TICKETING_REQUEST_TOPIC } from '@/lib/kafka/producer.constants'
import type { ProduceTicketingRequestData } from '@/lib/kafka/producer.types'

const kafka = new Kafka({ brokers: KAFKA_BROKERS.split(',') })
const producer = kafka.producer()

export const produceTicketingRequest = async (data: ProduceTicketingRequestData) => {
    await producer.send({
        topic: TICKETING_REQUEST_TOPIC,
        messages: [{ value: JSON.stringify(data) }],
    })

}
