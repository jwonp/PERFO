package com.perfo.backend.repository

import com.perfo.backend.entity.Event
import org.springframework.data.jpa.repository.JpaRepository

interface EventRepository : JpaRepository<Event, Long>
