import type { MCPTrace } from 'backend/types.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface MCPChunk {
  text: string;
  metadata: {
    noteId?: string;
    collection?: string;
    [key: string]: any;
  };
  score?: number;
}

interface MCPPanelProps {
  trace: MCPTrace;
}

export function MCPPanel({ trace }: MCPPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="h-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              MCP Trace
              <ChevronDown className={isOpen ? 'rotate-180' : ''} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {trace.transformedQuery && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Transformed Query:</h4>
                <p className="text-sm bg-muted p-2 rounded">{trace.transformedQuery}</p>
              </div>
            )}

            {trace.retrievedChunks && trace.retrievedChunks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Retrieved Chunks ({trace.retrievedChunks.length}):
                </h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {(trace.retrievedChunks as MCPChunk[]).map((chunk, idx) => (
                      <div key={idx} className="bg-muted p-2 rounded text-sm">
                        <div className="font-medium mb-1">
                          {chunk.metadata?.noteId || 'Unknown'} {chunk.score && `(${chunk.score.toFixed(3)})`}
                        </div>
                        <div className="text-muted-foreground line-clamp-3">{chunk.text}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {trace.mcpResponses && trace.mcpResponses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">MCP Responses ({trace.mcpResponses.length}):</h4>
                <div className="space-y-2">
                  {trace.mcpResponses.map((resp, idx) => (
                    <div key={resp.serviceId + idx} className="bg-muted p-2 rounded text-sm">
                      <div className="font-medium mb-1">{resp.serviceName}</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">{resp.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

