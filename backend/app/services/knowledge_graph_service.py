"""
Knowledge Graph extraction service.

Uses the configured AI model to extract entities (nodes) and relationships (edges) from text
chunks, then persists them into Neo4j with tenant/document isolation.
"""

import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.db.neo4j_driver import get_neo4j_driver
from app.services.ai_model_client import AIModelClient

logger = logging.getLogger(__name__)

# ── Extraction prompt ─────────────────────────────────────────────────────

EXTRACTION_SYSTEM_PROMPT = """\
You are a knowledge-graph extraction engine. Given a text chunk, extract
all meaningful **entities** and **relationships**.

Return a JSON object with two arrays:
{
  "entities": [
    {"id": "<unique_snake_case_id>", "label": "<human readable name>", "type": "<PERSON|ORGANIZATION|CONCEPT|TECHNOLOGY|LOCATION|EVENT|DOCUMENT|METRIC|PRODUCT|REGULATION|OTHER>"}
  ],
  "relationships": [
    {"source": "<entity_id>", "target": "<entity_id>", "type": "<RELATES_TO|WORKS_FOR|LOCATED_IN|PART_OF|USES|CREATED_BY|MENTIONS|DEPENDS_ON|MANAGES|REPORTS_TO|AUTHORED|REGULATES|FUNDS|COLLABORATES_WITH|OTHER>"}
  ]
}

Rules:
- Entity IDs must be stable, lowercase, underscore-separated identifiers derived from the label (e.g., "john_doe", "machine_learning").
- Only extract entities and relationships that are clearly supported by the text.
- Do NOT hallucinate entities or relationships not present in the text.
- Aim for 3-15 entities and 2-12 relationships per chunk (adjust to content density).
- Return ONLY the raw JSON object, no markdown fences, no explanation.
"""


class KnowledgeGraphService:
    """Extracts entities & relationships from text and persists to Neo4j."""

    def __init__(self) -> None:
        if settings.openai_api_key:
            self.models = AIModelClient()
        else:
            self.models = None

    # ── Public API ────────────────────────────────────────────────────────

    async def extract_and_store(
        self,
        *,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
        chunks: List[str],
    ) -> Dict[str, int]:
        """
        Extract entities/relationships from chunks and merge into Neo4j.
        Returns counts: {"nodes": N, "edges": M}.
        """
        if not self.models:
            logger.warning("No OPENAI_API_KEY configured - skipping graph extraction.")
            return {"nodes": 0, "edges": 0}

        all_entities: List[Dict[str, str]] = []
        all_relationships: List[Dict[str, str]] = []

        # Process chunks in batches to stay within rate limits
        for i, chunk_text in enumerate(chunks):
            try:
                entities, relationships = await self._extract_from_chunk(chunk_text)
                all_entities.extend(entities)
                all_relationships.extend(relationships)
            except Exception as e:
                logger.warning(f"Extraction failed for chunk {i}: {e}")
                continue

        # Deduplicate entities by id
        seen_ids = set()
        unique_entities = []
        for ent in all_entities:
            eid = ent.get("id", "")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                unique_entities.append(ent)

        # Store in Neo4j
        node_count = await self._merge_nodes(
            tenant_id=str(tenant_id),
            document_id=str(document_id),
            entities=unique_entities,
        )
        edge_count = await self._merge_edges(
            tenant_id=str(tenant_id),
            document_id=str(document_id),
            relationships=all_relationships,
        )

        logger.info(
            f"Graph extraction complete for doc {document_id}: "
            f"{node_count} nodes, {edge_count} edges."
        )
        return {"nodes": node_count, "edges": edge_count}

    # ── LLM Extraction ────────────────────────────────────────────────────

    async def _extract_from_chunk(
        self, text: str
    ) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
        """Call the configured AI model to extract entities and relationships from a single chunk."""
        raw = await self.models.chat_completion(
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Extract entities and relationships from this text:\n\n{text}",
                },
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )

        raw = raw.strip()

        # Parse JSON (handle possible markdown fences)
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            if raw.endswith("```"):
                raw = raw[: raw.rfind("```")]

        data = json.loads(raw)
        entities = data.get("entities", [])
        relationships = data.get("relationships", [])
        return entities, relationships

    # ── Neo4j Persistence ─────────────────────────────────────────────────

    async def _merge_nodes(
        self,
        *,
        tenant_id: str,
        document_id: str,
        entities: List[Dict[str, str]],
    ) -> int:
        """MERGE entity nodes into Neo4j, tagged with tenant_id and document_id."""
        if not entities:
            return 0

        driver = get_neo4j_driver()
        query = """
        UNWIND $entities AS ent
        MERGE (n:Entity {entity_id: ent.id, tenant_id: $tenant_id})
        ON CREATE SET
            n.label      = ent.label,
            n.type       = ent.type,
            n.created_at = datetime()
        ON MATCH SET
            n.label = ent.label,
            n.type  = ent.type
        WITH n
        MERGE (d:Document {doc_id: $document_id, tenant_id: $tenant_id})
        MERGE (n)-[:EXTRACTED_FROM]->(d)
        RETURN count(n) AS cnt
        """
        async with driver.session() as session:
            result = await session.run(
                query,
                entities=entities,
                tenant_id=tenant_id,
                document_id=document_id,
            )
            record = await result.single()
            return record["cnt"] if record else 0

    async def _merge_edges(
        self,
        *,
        tenant_id: str,
        document_id: str,
        relationships: List[Dict[str, str]],
    ) -> int:
        """MERGE relationships between entities in Neo4j."""
        if not relationships:
            return 0

        driver = get_neo4j_driver()
        query = """
        UNWIND $rels AS rel
        MATCH (src:Entity {entity_id: rel.source, tenant_id: $tenant_id})
        MATCH (tgt:Entity {entity_id: rel.target, tenant_id: $tenant_id})
        MERGE (src)-[r:RELATES_TO {rel_type: rel.type}]->(tgt)
        ON CREATE SET r.document_id = $document_id, r.created_at = datetime()
        RETURN count(r) AS cnt
        """
        async with driver.session() as session:
            result = await session.run(
                query,
                rels=relationships,
                tenant_id=tenant_id,
                document_id=document_id,
            )
            record = await result.single()
            return record["cnt"] if record else 0

    # ── Query helpers for the explore endpoint ────────────────────────────

    async def get_subgraph(
        self,
        *,
        tenant_id: str,
        query: Optional[str] = None,
        limit: int = 100,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Return nodes and edges for a tenant.
        If a query string is provided, filter nodes whose label contains it.
        """
        driver = get_neo4j_driver()

        if query and query.strip():
            # Fuzzy label match
            node_query = """
            MATCH (n:Entity {tenant_id: $tenant_id})
            WHERE toLower(n.label) CONTAINS toLower($query)
            WITH n LIMIT $limit
            OPTIONAL MATCH (n)-[r:RELATES_TO]-(m:Entity {tenant_id: $tenant_id})
            RETURN collect(DISTINCT {id: n.entity_id, label: n.label, type: n.type}) +
                   collect(DISTINCT {id: m.entity_id, label: m.label, type: m.type}) AS nodes,
                   collect(DISTINCT {source: startNode(r).entity_id, target: endNode(r).entity_id, type: r.rel_type}) AS edges
            """
            params = {"tenant_id": tenant_id, "query": query.strip(), "limit": limit}
        else:
            # Return a sample subgraph
            node_query = """
            MATCH (n:Entity {tenant_id: $tenant_id})
            WITH n LIMIT $limit
            OPTIONAL MATCH (n)-[r:RELATES_TO]-(m:Entity {tenant_id: $tenant_id})
            RETURN collect(DISTINCT {id: n.entity_id, label: n.label, type: n.type}) +
                   collect(DISTINCT {id: m.entity_id, label: m.label, type: m.type}) AS nodes,
                   collect(DISTINCT {source: startNode(r).entity_id, target: endNode(r).entity_id, type: r.rel_type}) AS edges
            """
            params = {"tenant_id": tenant_id, "limit": limit}

        async with driver.session() as session:
            result = await session.run(node_query, **params)
            record = await result.single()

            if not record:
                return {"nodes": [], "edges": []}

            # Deduplicate and clean nulls
            raw_nodes = record["nodes"] or []
            raw_edges = record["edges"] or []

            seen_node_ids = set()
            nodes = []
            for n in raw_nodes:
                if n and n.get("id") and n["id"] not in seen_node_ids:
                    seen_node_ids.add(n["id"])
                    nodes.append({
                        "id": n["id"],
                        "label": n.get("label", n["id"]),
                        "type": n.get("type", "OTHER"),
                        "tenant_id": tenant_id,
                    })

            edges = []
            for e in raw_edges:
                if e and e.get("source") and e.get("target"):
                    edges.append({
                        "id": f"{e['source']}__{e['target']}__{e.get('type', '')}",
                        "source": e["source"],
                        "target": e["target"],
                        "type": e.get("type", "RELATES_TO"),
                        "tenant_id": tenant_id,
                    })

            return {"nodes": nodes, "edges": edges}
