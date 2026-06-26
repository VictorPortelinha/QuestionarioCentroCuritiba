-- ════════════════════════════════════════════════════════════════
--  PPSIG Curitiba — Schema do Banco de Dados (MySQL 8.0+)
--  Programa Curitiba de Volta ao Centro
-- ════════════════════════════════════════════════════════════════
--
--  Modelo Relacional (resumo):
--
--    users (1) ───< (N) responses (1) ───< (N) markers
--                                  │
--    questions (1) ───────────────┘ (referência lógica por question_id)
--
--  Regras de negócio:
--    • 1 usuário pode ter no máximo 1 resposta (anti-spam por UNIQUE).
--    • 1 resposta agrupa vários marcadores (até 3 por pergunta).
--    • Senhas nunca são armazenadas em texto puro (hash bcrypt no app).
-- ════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS ppsig_curitiba
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ppsig_curitiba;

-- ─── Tabela: users ──────────────────────────────────────────────
-- Armazena os participantes cadastrados.
DROP TABLE IF EXISTS markers;
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL,
  age           TINYINT UNSIGNED NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,           -- bcrypt hash (nunca texto puro)
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_age  CHECK (age BETWEEN 16 AND 120)
) ENGINE=InnoDB;

-- ─── Tabela: responses ──────────────────────────────────────────
-- Cada usuário pode enviar UMA resposta (anti-spam via UNIQUE user_id).
CREATE TABLE responses (
  id            CHAR(36)      PRIMARY KEY,          -- UUID gerado no backend
  user_id       INT UNSIGNED  NOT NULL,
  comment       VARCHAR(600)  DEFAULT NULL,
  client_fingerprint VARCHAR(64) DEFAULT NULL,      -- camada extra anti-spam
  ip_address    VARCHAR(45)   DEFAULT NULL,
  user_agent    VARCHAR(255)  DEFAULT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_responses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  -- Garante 1 resposta por usuário (bloqueio de múltiplos envios)
  CONSTRAINT uq_responses_user UNIQUE (user_id)
) ENGINE=InnoDB;

-- ─── Tabela: markers ────────────────────────────────────────────
-- Pontos geográficos marcados, vinculados a uma resposta + pergunta.
CREATE TABLE markers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  response_id   CHAR(36)      NOT NULL,
  question_id   TINYINT UNSIGNED NOT NULL,          -- 1..11
  category      VARCHAR(20)   NOT NULL,             -- patrimonio | mobilidade | moradia | seguranca
  latitude      DECIMAL(10,7) NOT NULL,
  longitude     DECIMAL(10,7) NOT NULL,
  note          VARCHAR(200)  DEFAULT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_markers_response
    FOREIGN KEY (response_id) REFERENCES responses(id)
    ON DELETE CASCADE,

  INDEX idx_markers_question (question_id),
  INDEX idx_markers_category (category)
) ENGINE=InnoDB;

-- ─── View opcional: estatísticas por pergunta ───────────────────
CREATE OR REPLACE VIEW v_marker_stats AS
SELECT
  question_id,
  category,
  COUNT(*) AS total_markers,
  COUNT(DISTINCT response_id) AS total_responses
FROM markers
GROUP BY question_id, category;
