import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ExternalLink, LoaderCircle, LockKeyhole, MessageSquareText, Plus, Send, Trash2, User } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { maintenanceConversationApi } from "../api/maintenanceConversationApi";
import { resolveConversationSelection, updateConversationSearchParams } from "../api/conversationRequest";
import type { ConversationAnswer, ConversationDetail, ConversationSummary } from "../types/maintenanceConversation";
import type { VehicleResponse } from "@/features/garage/types/vehicle";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { getApiErrorMessage } from "@/shared/utils/api-error";

const HISTORY_KEY = (vehicleId: string) => ["ai-conversations", vehicleId] as const;
const DETAIL_KEY = (vehicleId: string, conversationId: string) => ["ai-conversation", vehicleId, conversationId] as const;

function shortDate(value: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function AnswerContent({ answer }: { answer: ConversationAnswer }) {
    const sourceByUrl = new Map(answer.sources.map((source) => [source.url, source]));
    return (
        <div className="space-y-3 text-sm">
            {answer.recorded_information.length > 0 && (
                <section className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-white/55">From your saved records</h4>
                    {answer.recorded_information.map((record) => (
                        <article key={record.reference} className="rounded-lg border border-white/10 bg-black/15 p-3">
                            <p className="font-medium">{record.type.replaceAll("_", " ")}{record.description ? ` · ${record.description}` : ""}</p>
                            <p className="mt-1 text-xs text-white/55">
                                {shortDate(record.service_date)}{record.mileage_at_service !== null ? ` · ${record.mileage_at_service.toLocaleString()} km` : ""}
                                {record.next_due_mileage !== null ? ` · next due at ${record.next_due_mileage.toLocaleString()} km` : ""}
                                {record.next_due_date ? ` · due ${shortDate(record.next_due_date)}` : ""}
                            </p>
                        </article>
                    ))}
                </section>
            )}
            {answer.researched_claims.length > 0 && (
                <section className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-white/55">External automotive information</h4>
                    {answer.researched_claims.map((claim, index) => (
                        <article key={`${claim.claim}-${index}`} className="rounded-lg border border-white/10 bg-black/15 p-3">
                            <p>{claim.claim}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                {claim.source_urls.map((url) => {
                                    const source = sourceByUrl.get(url);
                                    if (!source) return null;
                                    const sourceKind = source.source_type.toLowerCase().replaceAll("_", " ");
                                    return <span key={url} className="inline-flex flex-wrap items-center gap-x-2 gap-y-1"><a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-red-300 underline-offset-4 hover:underline">{source.title || source.name}<ExternalLink className="size-3" aria-hidden="true" /></a><span className="text-[11px] text-white/45">{sourceKind}</span></span>;
                                })}
                            </div>
                        </article>
                    ))}
                </section>
            )}
            {answer.interpretation && (
                <section className="rounded-lg border border-red-500/20 bg-red-500/[.06] p-3">
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-200">SmartDrive interpretation</h4>
                    <p>{answer.interpretation}</p>
                </section>
            )}
            {answer.limitations.length > 0 && <ul className="list-disc space-y-1 pl-5 text-xs text-white/55">{answer.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>}
            {answer.recorded_information.length === 0 && answer.researched_claims.length === 0 && !answer.interpretation && answer.limitations.length === 0 && <p className="text-white/55">There is not enough verified information to answer that question.</p>}
        </div>
    );
}

export function VehicleMaintenanceAssistant({ vehicle }: { vehicle: VehicleResponse }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const submitting = useRef(false);
    const requestedConversationId = searchParams.get("conversationId");
    const [draft, setDraft] = useState("");
    const [pendingQuestion, setPendingQuestion] = useState("");
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [retryRequest, setRetryRequest] = useState<{ conversationId: string; clientMessageId: string; content: string } | null>(null);
    const [sendError, setSendError] = useState<unknown>(null);
    const listQuery = useQuery({
        queryKey: HISTORY_KEY(vehicle.id),
        queryFn: () => maintenanceConversationApi.list(vehicle.id),
    });
    const conversations = listQuery.data ?? [];
    const conversationId = resolveConversationSelection(requestedConversationId, conversations) ?? "";
    const activeSummary = conversations.find((item) => item.id === conversationId);
    const detailQuery = useQuery({
        queryKey: DETAIL_KEY(vehicle.id, conversationId),
        queryFn: () => maintenanceConversationApi.get(vehicle.id, conversationId),
        enabled: Boolean(activeSummary),
    });
    const selectConversation = (id: string) => {
        setSearchParams((current) => updateConversationSearchParams(current, id));
        setRetryRequest(null);
        setSendError(null);
    };

    const createConversation = useMutation({
        mutationFn: () => maintenanceConversationApi.create(vehicle.id),
        onSuccess: (created) => {
            queryClient.setQueryData<ConversationSummary[]>(HISTORY_KEY(vehicle.id), (current) => [created, ...(current ?? []).filter((item) => item.id !== created.id)]);
            selectConversation(created.id);
        },
    });
    const deleteConversation = useMutation({
        mutationFn: (id: string) => maintenanceConversationApi.delete(vehicle.id, id),
        onSuccess: async (_, id) => {
            queryClient.setQueryData<ConversationSummary[]>(HISTORY_KEY(vehicle.id), (current) => (current ?? []).filter((item) => item.id !== id));
            queryClient.removeQueries({ queryKey: DETAIL_KEY(vehicle.id, id) });
            setDeleteOpen(false);
            selectConversation("");
            await queryClient.invalidateQueries({ queryKey: HISTORY_KEY(vehicle.id) });
        },
    });
    const sendMessage = useMutation({
        mutationFn: (request: { conversationId: string; clientMessageId: string; content: string }) =>
            maintenanceConversationApi.send(vehicle.id, request.conversationId, request.clientMessageId, request.content),
        onSuccess: async (turn, request) => {
            queryClient.setQueryData<ConversationDetail>(DETAIL_KEY(vehicle.id, request.conversationId), (current) => current ? { ...current, turns: [...current.turns.filter((item) => item.id !== turn.id), turn], turn_count: current.turn_count + 1, updated_at: turn.created_at } : current);
            setPendingQuestion("");
            setRetryRequest(null);
            setSendError(null);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: HISTORY_KEY(vehicle.id) }),
                queryClient.invalidateQueries({ queryKey: DETAIL_KEY(vehicle.id, request.conversationId) }),
            ]);
        },
        onError: (error, request) => {
            setRetryRequest(request);
            setSendError(error);
            setPendingQuestion("");
        },
    });

    const handleSend = async (content = draft) => {
        const question = content.trim();
        if (!question || sendMessage.isPending || createConversation.isPending || submitting.current || (retryRequest && sendError)) return;
        submitting.current = true;
        setSendError(null);
        setPendingQuestion(question);
        setDraft("");
        try {
            const session = activeSummary ?? await createConversation.mutateAsync();
            selectConversation(session.id);
            const request = {
                conversationId: session.id,
                clientMessageId: crypto.randomUUID(),
                content: question,
            };
            setRetryRequest(request);
            await sendMessage.mutateAsync(request);
        } catch (error) {
            if (!sendMessage.isError) {
                setPendingQuestion("");
                setDraft(question);
                setSendError(error);
            }
        } finally {
            submitting.current = false;
        }
    };

    const handleRetry = async () => {
        if (!retryRequest || sendMessage.isPending || submitting.current) return;
        submitting.current = true;
        setPendingQuestion(retryRequest.content);
        setSendError(null);
        try {
            await sendMessage.mutateAsync(retryRequest);
        } catch {
            // Mutation state renders the retryable error without an unhandled rejection.
        } finally {
            submitting.current = false;
        }
    };

    const suggestedQuestions = [
        "Based on my saved service history, what should I prioritize?",
        `What maintenance should I consider around ${vehicle.current_mileage.toLocaleString()} km?`,
        "Have I recorded any previous brake service?",
        "What should I inspect before a long-distance journey?",
    ];
    const isBusy = sendMessage.isPending || createConversation.isPending;

    return (
        <Card className="border-white/10 bg-[#121518] text-white">
            <CardHeader className="gap-4 border-b border-white/10 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300"><Bot className="size-5" aria-hidden="true" /></span>
                        <div>
                            <h2 className="font-heading text-lg font-semibold">SmartDrive AI Assistant</h2>
                            <p className="mt-1 text-sm text-white/55">{vehicle.manufacturer} {vehicle.model} {vehicle.variant} · {vehicle.current_mileage.toLocaleString()} km</p>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-2.5 py-1 text-xs text-emerald-200"><LockKeyhole className="size-3" aria-hidden="true" /> Read-only</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={activeSummary?.id ?? ""} onValueChange={(value) => selectConversation(String(value ?? ""))}>
                        <SelectTrigger className="h-10 min-w-0 flex-1 bg-black/15" aria-label="Choose a saved conversation">
                            <SelectValue placeholder={listQuery.isLoading ? "Loading conversations…" : "Choose a saved conversation"}>
                                {activeSummary?.title}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {conversations.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="h-10" disabled={isBusy || listQuery.isLoading || createConversation.isPending} onClick={() => void createConversation.mutateAsync().catch((error) => setSendError(error))}>
                        <Plus className="size-4" aria-hidden="true" /> New chat
                    </Button>
                    {activeSummary && <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <AlertDialogTrigger render={<Button type="button" variant="ghost" className="h-10 text-white/65 hover:text-red-300" disabled={isBusy}><Trash2 className="size-4" aria-hidden="true" /><span className="sm:hidden">Delete</span></Button>} />
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete this conversation?</AlertDialogTitle><AlertDialogDescription>This permanently deletes this vehicle conversation and its messages. Other saved conversations are kept.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteConversation.mutate(activeSummary.id)} disabled={deleteConversation.isPending} className="bg-red-600 text-white hover:bg-red-700">{deleteConversation.isPending ? "Deleting…" : "Delete conversation"}</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>}
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <p className="text-xs text-white/45">This assistant can explain records and cite automotive sources. It cannot change your vehicle, service history, or maintenance schedule. Messages are kept for 90 days after the last successful conversation activity.</p>
                {listQuery.isError && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/[.06] p-3 text-sm text-red-200">Unable to load saved conversations. {getApiErrorMessage(listQuery.error)}</div>}
                {detailQuery.isError && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/[.06] p-3 text-sm text-red-200">Unable to load this conversation. {getApiErrorMessage(detailQuery.error)}</div>}
                {createConversation.isError && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/[.06] p-3 text-sm text-red-200">Unable to start a new conversation. {getApiErrorMessage(createConversation.error)}</div>}

                {!activeSummary && !listQuery.isLoading && (
                    <div className="space-y-3 rounded-xl border border-dashed border-white/15 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium"><MessageSquareText className="size-4 text-red-300" aria-hidden="true" />Start a vehicle-specific conversation</div>
                        <div className="flex flex-wrap gap-2">{suggestedQuestions.map((question) => <button key={question} type="button" onClick={() => void handleSend(question)} disabled={isBusy || listQuery.isLoading} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-left text-xs text-white/75 transition hover:border-red-400/40 hover:bg-red-400/[.07] disabled:opacity-50">{question}</button>)}</div>
                    </div>
                )}

                {activeSummary && <div className="max-h-[55vh] min-h-48 space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-black/10 p-3 sm:p-4" aria-live="polite">
                    {detailQuery.isLoading && <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-white/55"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Loading conversation…</div>}
                    {!detailQuery.isLoading && (detailQuery.data?.turns.length ?? 0) === 0 && <p className="py-8 text-center text-sm text-white/50">Ask a question about this vehicle and its saved service history.</p>}
                    {detailQuery.data?.turns.map((turn) => <article key={turn.id} className="space-y-3">
                        <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-red-500/15 p-3 sm:max-w-[82%]">
                            <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-white/50"><span className="inline-flex items-center gap-1"><User className="size-3" aria-hidden="true" />You</span><time dateTime={turn.created_at}>{shortDate(turn.created_at)}</time></div>
                            <p className="whitespace-pre-wrap break-words">{turn.question}</p>
                        </div>
                        <div className="mr-auto max-w-[98%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.035] p-3 sm:max-w-[92%]">
                            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-red-200"><Bot className="size-3.5" aria-hidden="true" />SmartDrive AI</div>
                            {turn.answer ? <AnswerContent answer={turn.answer} /> : <p className="text-sm text-white/55">This response is not available.</p>}
                        </div>
                    </article>)}
                    {pendingQuestion && <div className="space-y-3"><div className="ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-red-500/15 p-3"><p className="whitespace-pre-wrap">{pendingQuestion}</p></div><div className="flex items-center gap-2 text-sm text-white/55"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Reviewing your vehicle context…</div></div>}
                </div>}

                {Boolean(sendError) && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/25 bg-red-500/[.06] p-3 text-sm text-red-200"><span>{getApiErrorMessage(sendError)}</span>{retryRequest && <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void handleRetry()} disabled={isBusy}>Retry</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setDraft(retryRequest.content); setRetryRequest(null); setSendError(null); }} disabled={isBusy}>Edit question</Button></div>}</div>}
                {activeSummary && detailQuery.data && detailQuery.data.turn_count >= 100 && <p className="text-xs text-amber-200">This conversation reached its 100-message limit. Start a new chat to continue.</p>}
                <div className="space-y-2">
                    {activeSummary && detailQuery.data?.turns.length === 0 && <div className="flex flex-wrap gap-2">{suggestedQuestions.slice(0, 3).map((question) => <button key={question} type="button" onClick={() => void handleSend(question)} disabled={isBusy || listQuery.isLoading} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:border-red-400/40 hover:text-white disabled:opacity-50">{question}</button>)}</div>}
                    <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/15 p-2 focus-within:border-red-400/40">
                        <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} maxLength={1_500} rows={2} aria-label="Ask SmartDrive AI about this vehicle" placeholder="Ask about maintenance, service history, or known concerns…" disabled={isBusy || listQuery.isLoading || Boolean(retryRequest && sendError) || (Boolean(activeSummary) && Boolean(detailQuery.data?.turn_count && detailQuery.data.turn_count >= 100))} className="max-h-36 min-h-12 flex-1 resize-y border-0 bg-transparent focus-visible:ring-0" />
                        <Button type="button" aria-label="Send question" onClick={() => void handleSend()} disabled={!draft.trim() || isBusy || listQuery.isLoading || Boolean(retryRequest && sendError)} className="mb-0.5 shrink-0 bg-red-600 text-white hover:bg-red-700"><Send className="size-4" aria-hidden="true" /></Button>
                    </div>
                    <div className="flex justify-between text-[11px] text-white/40"><span>Enter to send · Shift+Enter for a new line</span><span>{draft.length}/1,500</span></div>
                </div>
            </CardContent>
        </Card>
    );
}
