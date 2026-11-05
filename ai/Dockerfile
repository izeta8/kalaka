
FROM astral/uv:python3.12-bookworm-slim AS base
ENV UV_NO_DEV=1

FROM base AS venv
WORKDIR /opt/kalaka_ai
COPY pyproject.toml uv.lock ./
RUN uv sync --locked

FROM python:3.12-slim-bookworm AS runner
LABEL org.opencontainers.image.source="https://github.com/izeta8/kalaka"
WORKDIR /opt/kalaka_ai
RUN groupadd ai && useradd -g ai ai

COPY --from=venv /opt/kalaka_ai/.venv .venv
COPY --chown=ai:ai . .

USER ai

ENV PATH=/opt/kalaka_ai/.venv/bin:$PATH

CMD ["python", "-m", "moderation.worker"]