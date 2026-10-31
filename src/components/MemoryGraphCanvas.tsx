'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, RotateCcw, Zap } from 'lucide-react';
import { MemoryDocument, RetrievedMemory } from '@/types/memory';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  status: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  document?: MemoryDocument;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
  color: string;
  dashed?: boolean;
}

interface MemoryGraphCanvasProps {
  memories: MemoryDocument[];
  onInspectNode: (memory: RetrievedMemory) => void;
  lastUpdatedId?: string | null;
}

export default function MemoryGraphCanvas({
  memories,
  onInspectNode,
  lastUpdatedId,
}: MemoryGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const isDraggingRef = useRef(false);
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Initialize or update nodes and links whenever memories change
  useEffect(() => {
    const width = 600;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2;

    const existingMap = new Map<string, GraphNode>();
    nodesRef.current.forEach((n) => existingMap.set(n.id, n));

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Central workspace hub node
    nodes.push({
      id: 'hub-workspace',
      label: 'MongoDB Agentic Memory',
      type: 'hub',
      status: 'active',
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 20,
      color: '#00ed64',
    });

    // Color mapper
    const getColor = (type: string, status: string) => {
      if (status === 'superseded') return '#f43f5e';
      switch (type) {
        case 'constraint':
          return '#00ed64';
        case 'incident_fix':
          return '#f59e0b';
        case 'decision':
          return '#38bdf8';
        case 'fact':
          return '#a855f7';
        default:
          return '#10b981';
      }
    };

    memories.forEach((m, idx) => {
      const angle = (idx / Math.max(memories.length, 1)) * Math.PI * 2;
      const dist = 120 + (idx % 2) * 50;
      const prev = m._id ? existingMap.get(m._id) : null;

      const node: GraphNode = {
        id: m._id || `mem-${idx}`,
        label: m.title.length > 22 ? m.title.slice(0, 20) + '...' : m.title,
        type: m.type,
        status: m.lifecycle.status,
        x: prev ? prev.x : centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 20,
        y: prev ? prev.y : centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 20,
        vx: prev ? prev.vx : 0,
        vy: prev ? prev.vy : 0,
        radius: m.lifecycle.status === 'superseded' ? 10 : 14,
        color: getColor(m.type, m.lifecycle.status),
        document: m,
      };
      nodes.push(node);

      // Link to central hub
      if (m.lifecycle.status !== 'superseded') {
        links.push({
          source: 'hub-workspace',
          target: node.id,
          label: 'indexes',
          color: 'rgba(0, 237, 100, 0.25)',
        });
      }

      // Link superseded memories to their replacement
      if (m.lifecycle.supersededBy) {
        links.push({
          source: node.id,
          target: m.lifecycle.supersededBy,
          label: 'superseded_by',
          color: 'rgba(244, 63, 94, 0.6)',
          dashed: true,
        });
      }
    });

    nodesRef.current = nodes;
    linksRef.current = links;
  }, [memories]);

  // Physics animation loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let pulsePhase = 0;

    const render = () => {
      pulsePhase += 0.05;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Subtle background grid
      ctx.strokeStyle = 'rgba(0, 45, 60, 0.3)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const nodeMap = new Map<string, GraphNode>();
      nodes.forEach((n) => nodeMap.set(n.id, n));

      // Force-directed simulation physics
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        if (n1 === draggedNodeRef.current) continue;

        // Gravity towards center
        const gx = (centerX - n1.x) * 0.003;
        const gy = (centerY - n1.y) * 0.003;
        n1.vx += gx;
        n1.vy += gy;

        // Repulsion between nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);

          if (dist < 180) {
            const force = (180 - dist) / 180 * 0.35;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (n1.id !== 'hub-workspace') {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (n2.id !== 'hub-workspace' && n2 !== draggedNodeRef.current) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // Spring force along links
      for (const link of links) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (s && t) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = link.dashed ? 90 : 130;
          const springForce = (dist - targetDist) * 0.015;

          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          if (s.id !== 'hub-workspace' && s !== draggedNodeRef.current) {
            s.vx += fx;
            s.vy += fy;
          }
          if (t.id !== 'hub-workspace' && t !== draggedNodeRef.current) {
            t.vx -= fx;
            t.vy -= fy;
          }
        }
      }

      // Update positions with damping
      nodes.forEach((n) => {
        if (n.id !== 'hub-workspace' && n !== draggedNodeRef.current) {
          n.x += n.vx;
          n.y += n.vy;
          n.vx *= 0.88;
          n.vy *= 0.88;

          // Boundaries
          n.x = Math.max(30, Math.min(width - 30, n.x));
          n.y = Math.max(30, Math.min(height - 30, n.y));
        }
      });

      // Draw links
      links.forEach((link) => {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (s && t) {
          ctx.beginPath();
          ctx.strokeStyle = link.color;
          ctx.lineWidth = link.dashed ? 1.5 : 1.2;
          if (link.dashed) {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Draw nodes
      nodes.forEach((n) => {
        const isHovered = hoveredNode?.id === n.id;
        const isSelected = selectedNode?.id === n.id;
        const isUpdated = lastUpdatedId === n.id;

        // Glowing outer halo for active / updated nodes
        if (isUpdated || isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6 + Math.sin(pulsePhase) * 2, 0, Math.PI * 2);
          ctx.fillStyle = isUpdated ? 'rgba(0, 237, 100, 0.4)' : `${n.color}35`;
          ctx.fill();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.id === 'hub-workspace' ? '#001e2b' : '#002738';
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.8;
        ctx.stroke();

        // Inner core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Node Label
        ctx.font = n.id === 'hub-workspace' ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.fillStyle = isHovered || isSelected ? '#ffffff' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.radius + 13);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hoveredNode, selectedNode, lastUpdatedId]);

  // Mouse handlers for dragging & hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingRef.current && draggedNodeRef.current) {
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    const hit = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5);
    });

    setHoveredNode(hit || null);
    canvas.style.cursor = hit ? 'pointer' : 'default';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode && hoveredNode.id !== 'hub-workspace') {
      isDraggingRef.current = true;
      draggedNodeRef.current = hoveredNode;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  const handleClick = () => {
    if (hoveredNode && hoveredNode.document) {
      setSelectedNode(hoveredNode);
      onInspectNode(hoveredNode.document as RetrievedMemory);
    }
  };

  const handleResetView = () => {
    const width = 600;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2;

    nodesRef.current.forEach((n, idx) => {
      if (n.id === 'hub-workspace') {
        n.x = centerX;
        n.y = centerY;
      } else {
        const angle = (idx / Math.max(nodesRef.current.length, 1)) * Math.PI * 2;
        n.x = centerX + Math.cos(angle) * 130;
        n.y = centerY + Math.sin(angle) * 130;
      }
      n.vx = 0;
      n.vy = 0;
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#00141e] rounded-xl border border-emerald-950">
      {/* Legend & Controls overlay */}
      <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-2 bg-[#001e2b]/90 border border-emerald-950 p-2 rounded-lg text-[10px] backdrop-blur">
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-[#00ed64]" /> Constraint
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Incident Fix
        </span>
        <span className="flex items-center gap-1 text-rose-400">
          <span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> Superseded
        </span>
        <span className="flex items-center gap-1 text-purple-400">
          <span className="w-2 h-2 rounded-full bg-[#a855f7]" /> Ephemeral TTL
        </span>
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={handleResetView}
          className="p-1.5 rounded-lg bg-[#002738] text-slate-300 hover:text-white border border-emerald-950"
          title="Reset Graph Physics"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={650}
        height={450}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className="w-full h-full max-h-[500px]"
      />

      <div className="absolute bottom-2 left-3 text-[10px] text-slate-500 pointer-events-none">
        💡 Drag nodes to rearrange • Click any node to open Explainability Inspector
      </div>
    </div>
  );
}
