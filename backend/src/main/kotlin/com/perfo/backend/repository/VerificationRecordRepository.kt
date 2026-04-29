package com.perfo.backend.repository

import com.perfo.backend.entity.VerificationRecord
import org.springframework.data.jpa.repository.JpaRepository

interface VerificationRecordRepository : JpaRepository<VerificationRecord, Long>
