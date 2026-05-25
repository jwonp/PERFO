package com.perfo.backend.service.ticket

import org.springframework.web.multipart.MultipartFile

object TicketImageValidator {
    private const val MAX_TICKET_IMAGE_SIZE_BYTES = 5 * 1024 * 1024L

    data class DetectedTicketImage(
        val contentType: String,
        val extension: String,
    )

    fun validateUploadFile(file: MultipartFile) {
        require(!file.isEmpty) { "Ticket image file is required" }
        require(file.size in 1..MAX_TICKET_IMAGE_SIZE_BYTES) { "Ticket image must be 5MB or smaller" }

        val contentType = file.contentType?.lowercase()
        val fileName = file.originalFilename?.lowercase().orEmpty()
        require(contentType != "image/svg+xml" && !fileName.endsWith(".svg")) {
            "Unsupported ticket image format"
        }
    }

    fun detectSupportedImage(bytes: ByteArray): DetectedTicketImage {
        require(bytes.isNotEmpty()) { "Ticket image file is required" }

        if (bytes.size >= 8 && bytes.sliceArray(0..7).contentEquals(byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            ))
        ) {
            return DetectedTicketImage("image/png", "png")
        }

        if (bytes.size >= 3 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte() && bytes[2] == 0xFF.toByte()) {
            return DetectedTicketImage("image/jpeg", "jpg")
        }

        if (bytes.size >= 12 &&
            bytes.sliceArray(0..3).contentEquals(byteArrayOf(0x52, 0x49, 0x46, 0x46)) &&
            bytes.sliceArray(8..11).contentEquals(byteArrayOf(0x57, 0x45, 0x42, 0x50))
        ) {
            return DetectedTicketImage("image/webp", "webp")
        }

        val prefix = bytes.copyOfRange(0, minOf(bytes.size, 256)).toString(Charsets.UTF_8).trimStart()
        require(!prefix.startsWith("<svg", ignoreCase = true)) { "Unsupported ticket image format" }
        throw IllegalArgumentException("Unsupported ticket image format")
    }
}
