'use client';

import React, { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  name: string;
  trustLevel: 'trusted' | 'under_review' | 'untrusted' | 'suspended';
}

interface VouchRelation {
  sourceId: string;
  targetId: string;
}

interface VouchingGraphProps {
  users: User[];
  relations: VouchRelation[];
  onUserSelect?: (userId: string) => void;
  selectedUserId?: string;
}

interface GraphNode {
  id: string;
  name: string;
  trustLevel: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

export const VouchingGraph: React.FC<VouchingGraphProps> = ({
  users,
  relations,
  onUserSelect,
  selectedUserId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [highlightedChain, setHighlightedChain] = useState<Set<string>>(new Set());

  // Initialize nodes and links
  useEffect(() => {
    const initialNodes: GraphNode[] = users.map((user, index) => {
      const angle = (index / users.length) * Math.PI * 2;
      const radius = 150;
      return {
        id: user.id,
        name: user.name,
        trustLevel: user.trustLevel,
        x: 250 + radius * Math.cos(angle),
        y: 250 + radius * Math.sin(angle),
        vx: 0,
        vy: 0
      };
    });

    const initialLinks: GraphLink[] = relations.map((rel) => ({
      source: rel.sourceId,
      target: rel.targetId
    }));

    setNodes(initialNodes);
    setLinks(initialLinks);
  }, [users, relations]);

  // Handle user search highlighting
  useEffect(() => {
    if (!searchTerm) {
      setHighlightedChain(new Set());
      return;
    }

    const searchedUser = users.find((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!searchedUser) {
      setHighlightedChain(new Set());
      return;
    }

    // Trace vouch chain
    const chain = new Set<string>();
    const visited = new Set<string>();

    const trace = (userId: string) => {
      if (visited.has(userId)) return;
      visited.add(userId);
      chain.add(userId);

      relations.forEach((rel) => {
        if (rel.sourceId === userId) {
          trace(rel.targetId);
        }
        if (rel.targetId === userId) {
          trace(rel.sourceId);
        }
      });
    };

    trace(searchedUser.id);
    setHighlightedChain(chain);
  }, [searchTerm, users, relations]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawGraph = () => {
      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw links
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 2;
      links.forEach((link) => {
        const sourceNode = nodes.find((n) => n.id === link.source);
        const targetNode = nodes.find((n) => n.id === link.target);

        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);

          // Highlight chain
          if (
            highlightedChain.has(link.source) &&
            highlightedChain.has(link.target)
          ) {
            ctx.strokeStyle = '#46A8CC';
            ctx.lineWidth = 3;
          }

          ctx.stroke();
          ctx.strokeStyle = '#D1D5DB';
          ctx.lineWidth = 2;
        }
      });

      // Draw nodes
      nodes.forEach((node) => {
        const isSelected = selectedUserId === node.id;
        const isHighlighted = highlightedChain.has(node.id);

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? 12 : 10, 0, Math.PI * 2);

        const bgColor = {
          trusted: '#10B981',
          under_review: '#F59E0B',
          untrusted: '#DC2626',
          suspended: '#6B7280'
        }[node.trustLevel] ?? '#6B7280';

        if (isHighlighted) {
          ctx.strokeStyle = '#46A8CC';
          ctx.lineWidth = 3;
        }

        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#000000' : 'transparent';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node label
        ctx.fillStyle = '#000000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name.substring(0, 3), node.x, node.y);
      });

      requestAnimationFrame(drawGraph);
    };

    drawGraph();
  }, [nodes, links, selectedUserId, highlightedChain]);

  const handleCanvasClick = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedNode = nodes.find((node) => {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return distance <= 10;
    });

    if (clickedNode) {
      onUserSelect?.(clickedNode.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Vouch Network</h2>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search user..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
          <span>Trusted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
          <span>Under Review</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#DC2626' }}></div>
          <span>Untrusted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#6B7280' }}></div>
          <span>Suspended</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={600}
        height={500}
        onClick={handleCanvasClick}
        className="w-full border border-gray-300 rounded-lg cursor-pointer bg-white"
        style={{ maxHeight: '500px' }}
      />

      {/* Info */}
      <p className="text-xs text-gray-500 mt-2">
        Click on nodes to inspect user details. Highlighted chain shows vouch connections.
      </p>
    </div>
  );
};
