package com.perfo.backend.service

import com.perfo.backend.config.MinioProperties
import io.minio.BucketExistsArgs
import io.minio.GetObjectArgs
import io.minio.MakeBucketArgs
import io.minio.MinioClient
import io.minio.PutObjectArgs
import io.minio.RemoveObjectArgs
import org.springframework.stereotype.Service
import java.io.ByteArrayInputStream

@Service
class TicketImageStorageService(
    private val minioClient: MinioClient,
    private val minioProperties: MinioProperties,
) {
    @Volatile
    private var bucketEnsured = false

    fun uploadTicketImage(objectKey: String, bytes: ByteArray, contentType: String): String {
        ensureBucketExists()

        try {
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(minioProperties.bucketTicketImages)
                    .`object`(objectKey)
                    .stream(ByteArrayInputStream(bytes), bytes.size.toLong(), -1)
                    .contentType(contentType)
                    .build(),
            )
        } catch (exception: Exception) {
            throw IllegalStateException("Ticket image upload failed", exception)
        }

        return objectKey
    }

    fun downloadTicketImage(objectKey: String): ProfileImageContent {
        try {
            minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(minioProperties.bucketTicketImages)
                    .`object`(objectKey)
                    .build(),
            ).use { inputStream ->
                val bytes = inputStream.readAllBytes()
                val contentType = inputStream.headers()["Content-Type"] ?: "application/octet-stream"
                return ProfileImageContent(bytes = bytes, contentType = contentType)
            }
        } catch (exception: Exception) {
            throw IllegalStateException("Ticket image read failed", exception)
        }
    }

    fun deleteTicketImage(objectKey: String) {
        try {
            minioClient.removeObject(
                RemoveObjectArgs.builder()
                    .bucket(minioProperties.bucketTicketImages)
                    .`object`(objectKey)
                    .build(),
            )
        } catch (_: Exception) {
            return
        }
    }

    fun buildTicketImageUrl(ticketId: Long): String {
        return "/api/tickets/$ticketId/image"
    }

    private fun ensureBucketExists() {
        if (bucketEnsured) {
            return
        }

        synchronized(this) {
            if (bucketEnsured) {
                return
            }

            try {
                val exists = minioClient.bucketExists(
                    BucketExistsArgs.builder()
                        .bucket(minioProperties.bucketTicketImages)
                        .build(),
                )

                if (!exists) {
                    minioClient.makeBucket(
                        MakeBucketArgs.builder()
                            .bucket(minioProperties.bucketTicketImages)
                            .build(),
                    )
                }
            } catch (exception: Exception) {
                throw IllegalStateException("Ticket image storage is unavailable", exception)
            }

            bucketEnsured = true
        }
    }
}
