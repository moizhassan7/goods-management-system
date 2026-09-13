'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Package,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { MasterDataType, DependencyCheckResult } from '@/lib/master-data-dependencies';

const API_PATHS: Record<MasterDataType, string> = {
  city: '/api/cities',
  agency: '/api/agencies',
  vehicle: '/api/vehicles',
  party: '/api/parties',
  item: '/api/items',
  'labour-person': '/api/labour-persons',
};

interface DeleteMasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: MasterDataType;
  entityTitle: string;
  entityName: string;
  entityId: number | string | null;
  onSuccess: () => void;
}

export default function DeleteMasterDataModal({
  isOpen,
  onClose,
  entityType,
  entityTitle,
  entityName,
  entityId,
  onSuccess,
}: DeleteMasterDataModalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkResult, setCheckResult] = useState<DependencyCheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const fetchDependencies = useCallback(async () => {
    if (!entityId || !isOpen) return;

    setIsChecking(true);
    setCheckError(null);

    try {
      const res = await fetch(
        `/api/master-data/dependencies?type=${entityType}&id=${entityId}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to check dependencies.');
      }

      setCheckResult(data);
    } catch (err: any) {
      console.error('Error fetching dependencies:', err);
      setCheckError(err.message || 'Failed to check dependencies.');
    } finally {
      setIsChecking(false);
    }
  }, [entityId, entityType, isOpen]);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchDependencies();
    } else {
      setCheckResult(null);
      setCheckError(null);
      setIsChecking(false);
      setIsDeleting(false);
    }
  }, [isOpen, entityId, fetchDependencies]);

  const handleConfirmDelete = async () => {
    if (!entityId) return;

    setIsDeleting(true);
    try {
      const endpoint = `${API_PATHS[entityType]}/${entityId}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`${entityTitle} deleted successfully.`);
        onClose();
        onSuccess();
      } else if (res.status === 409 && data.canDelete === false) {
        // Backend blocked delete because of active dependencies
        toast.error(data.error || 'Cannot delete: record has active dependencies.');
        setCheckResult(data);
      } else {
        toast.error(data.error || `Failed to delete ${entityTitle}.`);
      }
    } catch (err: any) {
      toast.error(err.message || `Could not delete ${entityTitle}.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasDependencies = checkResult && (!checkResult.canDelete || checkResult.totalCount > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
        {/* Header section with contextual styling */}
        <div
          className={`px-6 pt-6 pb-4 border-b ${
            isChecking
              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
              : hasDependencies
              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40'
              : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isChecking
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                  : hasDependencies
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {isChecking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : hasDependencies ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>
                  {isChecking
                    ? `Verifying ${entityTitle}...`
                    : hasDependencies
                    ? `Cannot Delete ${entityTitle}`
                    : `Confirm Deletion`}
                </span>
                <span className="font-mono text-xs text-slate-400 font-normal">
                  ID: #{entityId}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {entityTitle}: <strong className="text-slate-800 dark:text-slate-200">{entityName}</strong>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {isChecking ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Checking for Linked Records...
                </p>
                <p className="text-xs text-slate-400">
                  Verifying shipments, bilities, logs, and financial records referencing this {entityTitle.toLowerCase()}.
                </p>
              </div>
            </div>
          ) : checkError ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">
                {checkError}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDependencies}
                className="gap-1.5 text-xs rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Check
              </Button>
            </div>
          ) : hasDependencies ? (
            <div className="space-y-4">
              {/* Warning Banner */}
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Deletion Blocked - Active References Found</span>
                </div>
                <p className="text-rose-700 dark:text-rose-400 leading-relaxed">
                  This {entityTitle.toLowerCase()} is currently linked to{' '}
                  <strong className="font-extrabold text-rose-900 dark:text-rose-200">
                    {checkResult?.totalCount} active record(s)
                  </strong>{' '}
                  (e.g., shipments or logs). To protect audit and transaction history, it cannot be deleted.
                </p>
              </div>

              {/* Linked Records Breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Referencing Records ({checkResult?.totalCount}):
                </p>

                <ScrollArea className="max-h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-2.5">
                  <div className="space-y-3">
                    {checkResult?.categories.map((cat, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                          <span>{cat.title}</span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono px-1.5 py-0 h-4 bg-slate-200 dark:bg-slate-800"
                          >
                            {cat.count}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          {cat.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white font-mono truncate">
                                      {item.primaryText}
                                    </span>
                                    {item.badge && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {item.secondaryText}
                                  </p>
                                </div>
                              </div>

                              {item.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0 transition-colors ml-2"
                                  title="View Record in New Tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}

                          {cat.count > cat.items.length && (
                            <p className="text-[10px] text-slate-400 text-center py-1 italic font-medium">
                              + {cat.count - cat.items.length} additional records not shown
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <p className="text-[11px] text-slate-500 italic text-center">
                To delete this {entityTitle.toLowerCase()}, you must delete or reassign all referencing shipments/records first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Safe to Delete Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Verified Safe for Deletion</span>
                </div>
                <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  No shipments, trip logs, or transactions reference this {entityTitle.toLowerCase()}. It can be removed cleanly.
                </p>
              </div>

              <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <p>
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900 dark:text-white font-bold">{entityName}</strong>?
                </p>
                <p className="text-slate-400 text-[11px]">
                  This action is irreversible. The record will be permanently deleted from the database.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex sm:justify-between items-center gap-2">
          {hasDependencies ? (
            <div className="w-full flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl text-xs font-semibold px-5"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isDeleting}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting || isChecking || !!checkError}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Delete {entityTitle}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
