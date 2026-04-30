package com.perfo.backend.config

import io.minio.MinioClient
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@ConfigurationProperties(prefix = "app.storage.minio")
data class MinioProperties(
    var endpoint: String = "http://localhost:9000",
    var accessKey: String = "",
    var secretKey: String = "",
    var region: String = "ap-northeast-2",
    var bucketProfileImages: String = "profile-images",
    var bucketTicketImages: String = "ticket-images",
    var publicBaseUrl: String = "",
)

@Configuration
@EnableConfigurationProperties(MinioProperties::class)
class MinioConfig {

    @Bean
    fun minioClient(properties: MinioProperties): MinioClient {
        return MinioClient.builder()
            .endpoint(properties.endpoint)
            .credentials(properties.accessKey, properties.secretKey)
            .region(properties.region)
            .build()
    }
}
