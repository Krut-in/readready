"use client";

import * as React from "react";
import { X, Trash2, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface Annotation {
  id: string;
  cfiRange: string;
  text: string;
  note?: string;
  color: string;
  createdAt: string;
}

interface AnnotationManagerProps {
  annotations: Annotation[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJumpTo: (cfi: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, note: string) => void;
}

export function AnnotationManager({
  annotations,
  isOpen,
  onOpenChange,
  onJumpTo,
  onDelete,
  onUpdate,
}: AnnotationManagerProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");

  const handleEditStart = (ann: Annotation) => {
    setEditingId(ann.id);
    setEditValue(ann.note || "");
  };

  const handleSave = () => {
    if (editingId) {
      onUpdate(editingId, editValue);
      setEditingId(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[300px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Annotations</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {annotations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              No annotations yet. Select text to add one.
            </p>
          ) : (
            annotations.map((ann) => (
              <div key={ann.id} className="space-y-2 group">
                <div 
                  className={cn(
                    "p-3 rounded-md bg-muted/50 border-l-4 cursor-pointer hover:bg-muted transition-colors",
                    ann.color === "yellow" && "border-yellow-400",
                    ann.color === "red" && "border-red-400",
                    ann.color === "green" && "border-green-400",
                    ann.color === "blue" && "border-blue-400",
                  )}
                  onClick={() => onJumpTo(ann.cfiRange)}
                >
                  <blockquote className="text-sm italic text-muted-foreground border-l-2 pl-2 mb-2 line-clamp-3">
                    &quot;{ann.text}&quot;
                  </blockquote>
                  
                  {editingId === ann.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Textarea 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Add a note..."
                        className="text-sm min-h-[100px]"
                      />
                      <div className="flex justify-end gap-2">
                         <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                         <Button size="sm" onClick={handleSave}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {ann.note && (
                        <p className="text-sm whitespace-pre-wrap">{ann.note}</p>
                      )}
                      
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6" 
                          onClick={(e) => { e.stopPropagation(); handleEditStart(ann); }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 hover:text-destructive" 
                          onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
