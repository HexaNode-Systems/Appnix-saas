"use client";

import { useState, useEffect } from "react";
import {
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Layers,
  HelpCircle,
  Loader2,
  Eye,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/axios";
import { cn } from "@/lib/utils";

export interface InstagramRuleItem {
  id?: string;
  name: string;
  postScope: "ALL_POSTS" | "SPECIFIC_POST";
  specificMediaId?: string | null;
  triggerKeywords: string[];
  publicReplyTemplate?: string | null;
  privateDmTemplate: string;
  isActive: boolean;
}

interface InstagramRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelUsername: string;
  existingRule?: InstagramRuleItem | null;
  onSaved: () => void;
}

export function InstagramRuleModal({
  isOpen,
  onClose,
  channelId,
  channelUsername,
  existingRule,
  onSaved,
}: InstagramRuleModalProps) {
  const [name, setName] = useState("");
  const [postScope, setPostScope] = useState<"ALL_POSTS" | "SPECIFIC_POST">("ALL_POSTS");
  const [specificMediaId, setSpecificMediaId] = useState("");
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>(["demo", "price", "link"]);
  const [keywordInput, setKeywordInput] = useState("");
  const [enablePublicReply, setEnablePublicReply] = useState(true);
  const [publicReplyTemplate, setPublicReplyTemplate] = useState(
    "Hey @{{username}}! Just sent you a private DM with the details 🚀",
  );
  const [privateDmTemplate, setPrivateDmTemplate] = useState(
    "Hey {{username}}! Thanks for commenting. Here is the link you requested:\n\n👉 https://appnix.co.in/demo\n\nLet us know if you have any questions!",
  );
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existingRule) {
      setName(existingRule.name);
      setPostScope(existingRule.postScope);
      setSpecificMediaId(existingRule.specificMediaId || "");
      setTriggerKeywords(existingRule.triggerKeywords || []);
      setEnablePublicReply(Boolean(existingRule.publicReplyTemplate));
      setPublicReplyTemplate(
        existingRule.publicReplyTemplate ||
          "Hey @{{username}}! Check your DMs 🚀",
      );
      setPrivateDmTemplate(existingRule.privateDmTemplate || "");
      setIsActive(existingRule.isActive);
    } else {
      setName("Lead Magnet Comment-to-DM");
      setPostScope("ALL_POSTS");
      setSpecificMediaId("");
      setTriggerKeywords(["demo", "link", "price"]);
      setEnablePublicReply(true);
      setPublicReplyTemplate(
        "Hey @{{username}}! Just sent you a private DM with the details 🚀",
      );
      setPrivateDmTemplate(
        "Hey {{username}}! Thanks for commenting. Here is the link you requested:\n\n👉 https://appnix.co.in/demo\n\nFeel free to ask any questions!",
      );
      setIsActive(true);
    }
    setErrorMessage(null);
  }, [existingRule, isOpen]);

  if (!isOpen) return null;

  const handleAddKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !triggerKeywords.includes(kw)) {
      setTriggerKeywords([...triggerKeywords, kw]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setTriggerKeywords(triggerKeywords.filter((k) => k !== kwToRemove));
  };

  const handleKeyDownKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleInsertVariable = (v: string, target: "public" | "dm") => {
    if (target === "public") {
      setPublicReplyTemplate((prev) => prev + ` {{${v}}}`);
    } else {
      setPrivateDmTemplate((prev) => prev + ` {{${v}}}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please give your rule a name.");
      return;
    }
    if (triggerKeywords.length === 0) {
      setErrorMessage("Please specify at least one trigger keyword.");
      return;
    }
    if (!privateDmTemplate.trim()) {
      setErrorMessage("Please provide a direct message template.");
      return;
    }
    if (postScope === "SPECIFIC_POST" && !specificMediaId.trim()) {
      setErrorMessage("Please enter the specific Instagram Media ID.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const payload = {
        name: name.trim(),
        postScope,
        specificMediaId: postScope === "SPECIFIC_POST" ? specificMediaId.trim() : undefined,
        triggerKeywords,
        publicReplyTemplate: enablePublicReply ? publicReplyTemplate.trim() : null,
        privateDmTemplate: privateDmTemplate.trim(),
        isActive,
      };

      if (existingRule?.id) {
        await api.put(`/channels/instagram/${channelId}/rules/${existingRule.id}`, payload);
      } else {
        await api.post(`/channels/instagram/${channelId}/rules`, payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || "Failed to save Comment-to-DM automation rule.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {existingRule ? "Edit Comment-to-DM Rule" : "Create Comment-to-DM Automation Rule"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Channel: <strong className="text-foreground">@{channelUsername}</strong>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Body: Split View (Form on Left, Live Simulator on Right) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x">
            {/* Left Form: Config Options */}
            <div className="lg:col-span-7 p-6 space-y-5 text-xs">
              {errorMessage && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Rule Name & Active Status */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-semibold text-foreground">
                    Rule Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Free Demo Link Auto-Reply"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs h-8.5"
                  />
                </div>
                <div className="space-y-1 pt-4 flex flex-col items-end">
                  <span className="text-[11px] font-medium text-muted-foreground">Rule Status</span>
                  <div className="flex items-center gap-2">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <span className="text-xs font-semibold">{isActive ? "Active" : "Paused"}</span>
                  </div>
                </div>
              </div>

              {/* Post Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Post Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPostScope("ALL_POSTS")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      postScope === "ALL_POSTS"
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">All Posts & Reels</span>
                      {postScope === "ALL_POSTS" && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Trigger on any comment across your entire account.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostScope("SPECIFIC_POST")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      postScope === "SPECIFIC_POST"
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Specific Post Only</span>
                      {postScope === "SPECIFIC_POST" && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Target comments on one designated Reel or Post.
                    </p>
                  </button>
                </div>

                {postScope === "SPECIFIC_POST" && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Instagram Media ID *
                    </label>
                    <Input
                      required
                      placeholder="e.g. 17923485028475923"
                      value={specificMediaId}
                      onChange={(e) => setSpecificMediaId(e.target.value)}
                      className="text-xs h-8 font-mono mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Trigger Keywords Tag Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Trigger Keywords *</span>
                  <span className="text-[10px] text-muted-foreground">Press Enter or comma to add</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add keyword (e.g. demo, price, guide)..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeyDownKeyword}
                    className="text-xs h-8.5"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddKeyword}
                    className="h-8.5 text-xs px-3"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {triggerKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="text-xs py-1 px-2.5 gap-1.5 font-mono bg-muted text-foreground hover:bg-muted"
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  When someone comments any of these words on your post, the automation will trigger.
                </p>
              </div>

              {/* Action 1: Public Reply */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-foreground">
                      Action 1: Public Comment Reply
                    </span>
                  </div>
                  <Switch
                    checked={enablePublicReply}
                    onCheckedChange={setEnablePublicReply}
                  />
                </div>

                {enablePublicReply && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Comment reply text:</span>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable("username", "public")}
                        className="text-primary hover:underline font-medium"
                      >
                        + Insert @username
                      </button>
                    </div>
                    <Input
                      value={publicReplyTemplate}
                      onChange={(e) => setPublicReplyTemplate(e.target.value)}
                      placeholder="e.g. Check your DMs! 🚀"
                      className="text-xs h-8.5"
                    />
                  </div>
                )}
              </div>

              {/* Action 2: Private Direct Message (DM) */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold text-foreground">
                      Action 2: Private Direct Message (DM) *
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleInsertVariable("username", "dm")}
                      className="text-primary hover:underline font-medium bg-primary/10 px-2 py-0.5 rounded"
                    >
                      + {"{{username}}"}
                    </button>
                  </div>
                </div>

                <Textarea
                  required
                  rows={4}
                  value={privateDmTemplate}
                  onChange={(e) => setPrivateDmTemplate(e.target.value)}
                  placeholder="Type the message to send to the commenter's Instagram inbox..."
                  className="text-xs resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Sent directly via official Meta Instagram Messaging API to the commenter.
                </p>
              </div>
            </div>

            {/* Right Side: Live Instagram Simulation Preview */}
            <div className="lg:col-span-5 p-6 bg-muted/10 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Eye className="h-4 w-4 text-pink-500" />
                  <span>Live Comment-to-DM Preview</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Visual simulation of how the commenter experiences this automation.
                </p>
              </div>

              {/* Phone Mockup Screen */}
              <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4 text-xs font-sans">
                {/* Step 1: User Comment */}
                <div className="space-y-1 border-b pb-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    1. Inbound User Comment
                  </p>
                  <div className="flex items-start gap-2 pt-1">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      U
                    </div>
                    <div className="flex-1 bg-muted/40 p-2 rounded-xl">
                      <span className="font-bold text-foreground">user_alex</span>{" "}
                      <span className="text-muted-foreground">
                        Can you share the{" "}
                        <strong className="text-pink-600 underline">
                          {triggerKeywords[0] || "demo"}
                        </strong>{" "}
                        link?
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 2: Public Reply */}
                {enablePublicReply && (
                  <div className="space-y-1 border-b pb-3 animate-in fade-in">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      2. Automated Public Reply
                    </p>
                    <div className="flex items-start gap-2 pl-4 pt-1">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 text-white flex items-center justify-center font-bold text-[10px]">
                        IG
                      </div>
                      <div className="flex-1 bg-primary/5 border border-primary/10 p-2 rounded-xl">
                        <span className="font-bold text-foreground">@{channelUsername}</span>{" "}
                        <span className="text-foreground">
                          {publicReplyTemplate.replace("{{username}}", "user_alex")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Private DM */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>3. Instagram Direct Inbox (DM)</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500 text-emerald-600">
                      Delivered
                    </Badge>
                  </p>
                  <div className="rounded-xl border bg-muted/20 p-3 space-y-2 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 text-white flex items-center justify-center font-bold text-[9px]">
                        IG
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-[11px]">@{channelUsername}</p>
                        <p className="text-[9px] text-muted-foreground">Active Now • Direct Message</p>
                      </div>
                    </div>
                    <div className="bg-primary text-primary-foreground p-2.5 rounded-xl rounded-tl-xs whitespace-pre-line text-xs shadow-xs">
                      {privateDmTemplate.replace("{{username}}", "user_alex")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Footer */}
              <div className="rounded-xl border border-muted-foreground/20 bg-muted/20 p-3 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">💡 Pro-Tip: </span>
                Include emojis and a clear call-to-action link in your DM template to boost conversion rates up to 300%.
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="text-xs bg-primary text-primary-foreground font-semibold gap-1.5 shadow-sm"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{existingRule ? "Save Changes" : "Create Automation Rule"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
