package com.perfo.backend.service

class PublicTicketImageUnavailableException(
    message: String = "Ticket image not found",
) : RuntimeException(message)
