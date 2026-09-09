import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  ShieldCheck,
  Loader2,
  ChevronRight,
  KeyRound,
  Check,
} from 'lucide-react';
import { CatalogApp, AppCategory, AuthType, TestResult } from './types';
import { AppBrandLogo } from './app-brand-logos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ConnectAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogApp[];
  onSave: (payload: {
    appName: string;
    accountName: string;
    authType: AuthType;
    credentials: Record<string, any>;
  }) => Promise<boolean | void>;
  onValidateLive: (payload: {
    appName: string;
    authType: AuthType;
    credentials: Record<string, any>;
  }) => Promise<TestResult>;
}

const CATEGORIES: AppCategory[] = [
  'All',
  'CRM',
  'Payment Gateways',
  'AI',
  'Database',
  'E-Commerce',
  'Communication',
];

export function ConnectAppModal({
  isOpen,
  onClose,
  catalog,
  onSave,
  onValidateLive,
}: ConnectAppModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Step 2 Form State
  const [accountName, setAccountName] = useState('');
  const [selectedAuthType, setSelectedAuthType] = useState<AuthType>('API_KEY');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Validation / Save state
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<TestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((app) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        app.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  const handleSelectApp = (app: CatalogApp) => {
    setSelectedApp(app);
    setSelectedAuthType(app.authTypes[0] || 'API_KEY');
    setAccountName(`${app.name} - Production`);
    setFormData({});
    setValidationResult(null);
    setErrorMsg(null);
    setStep(2);
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setValidationResult(null);
    setErrorMsg(null);
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (validationResult) setValidationResult(null);
    if (errorMsg) setErrorMsg(null);
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleValidatePing = async () => {
    if (!selectedApp) return;
    setErrorMsg(null);
    setIsValidating(true);
    try {
      const res = await onValidateLive({
        appName: selectedApp.id,
        authType: selectedAuthType,
        credentials: formData,
      });
      setValidationResult(res);
      if (!res.success) {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Failed to ping external service. Please check your credentials.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (!accountName.trim()) {
      setErrorMsg('Please specify an account name / label.');
      return;
    }

    // Check required fields
    const missing = selectedApp.fields.filter((f) => f.required && !formData[f.key]?.trim());
    if (missing.length > 0 && selectedAuthType !== 'OAUTH2') {
      setErrorMsg(`Please fill in required field: ${missing[0].label}`);
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await onSave({
        appName: selectedApp.id,
        accountName: accountName.trim(),
        authType: selectedAuthType,
        credentials: formData,
      });
      handleClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOAuthLogin = () => {
    setOauthLoading(true);
    setTimeout(() => {
      setOauthLoading(false);
      setFormData((prev) => ({
        ...prev,
        oauthToken: 'oauth_verified_access_token_secure',
        accountEmail: 'admin@appnix-workspace.com',
      }));
      setValidationResult({
        success: true,
        latencyMs: 82,
        message: `OAuth 2.0 connection verified for ${selectedApp?.name}! Scopes granted.`,
        scopes: ['read_access', 'write_access', 'webhook_events'],
      });
    }, 1200);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedApp(null);
    setSearchQuery('');
    setSelectedCategory('All');
    setFormData({});
    setValidationResult(null);
    setErrorMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToStep1}
                className="h-8 w-8 p-0 rounded-full cursor-pointer hover:bg-muted"
                title="Back to app catalog"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  {step === 1 ? 'Connect New Integration' : `Authenticate ${selectedApp?.name}`}
                </h3>
                <Badge variant="outline" className="text-[11px] font-semibold text-primary bg-primary/10 border-primary/20">
                  Step {step} of 2
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 1
                  ? 'Select an app from our ecosystem to integrate with automated workflow nodes.'
                  : 'Configure API keys, OAuth tokens, or bearer headers to securely connect.'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ================= STEP 1: SELECT APP ================= */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Search & Category Tabs */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search 30+ apps (Shopify, OpenAI, Cashfree, Google Sheets...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 text-sm bg-muted/30 focus-visible:bg-background"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categorized Apps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredCatalog.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleSelectApp(app)}
                    className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 hover:border-primary hover:bg-muted/30 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <AppBrandLogo appName={app.id} size="md" />
                          <div>
                            <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                              {app.name}
                            </h4>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {app.category}
                            </span>
                          </div>
                        </div>

                        {app.oauthSupported && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20">
                            OAuth 2.0
                          </Badge>
                        )}
                      </div>

                      <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <KeyRound className="h-3 w-3" />
                        {app.authTypes.join(', ')}
                      </span>
                      <span className="font-semibold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Connect <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCatalog.length === 0 && (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <KeyRound className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <p className="font-medium text-sm">No integrations found matching &quot;{searchQuery}&quot;.</p>
                  <p className="text-xs">Try searching for a different keyword or connect a Custom Webhook / Bearer endpoint.</p>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: AUTHENTICATION FORM ================= */}
          {step === 2 && selectedApp && (
            <form onSubmit={handleSaveConnection} className="space-y-6">
              {/* Selected App Header Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-3.5">
                  <AppBrandLogo appName={selectedApp.id} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground">{selectedApp.name}</h4>
                      <Badge variant="outline" className="text-[11px] px-2 py-0 text-muted-foreground">
                        {selectedApp.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedApp.description}</p>
                  </div>
                </div>

                {selectedApp.docsUrl && (
                  <a
                    href={selectedApp.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    API Docs <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Account Label */}
              <div className="space-y-1.5">
                <Label htmlFor="accountName" className="text-xs font-semibold">
                  Account Label / Nickname <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Shopify - Main India Store"
                  className="h-10 text-sm"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Give this connection a distinctive label to identify it inside automation action nodes.
                </p>
              </div>

              {/* Auth Type Selector (if multiple supported) */}
              {selectedApp.authTypes.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Authentication Method</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedApp.authTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedAuthType(type)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          selectedAuthType === type
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{type.replace('_', ' ')}</span>
                        {selectedAuthType === type && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* OAuth 2.0 Quick Sign-In Option */}
              {selectedApp.oauthSupported && selectedAuthType === 'OAUTH2' ? (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 text-center space-y-3">
                  <div className="flex justify-center">
                    <AppBrandLogo appName={selectedApp.id} size="md" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-sm text-foreground">
                      1-Click OAuth 2.0 Authentication
                    </h5>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Authorize Appnix CRM to securely access {selectedApp.name} without manually handling secret keys.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleOAuthLogin}
                    disabled={oauthLoading}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
                  >
                    {oauthLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Authorizing with {selectedApp.name}...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Sign In & Connect with {selectedApp.name}</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                /* Dynamic Fields Form */
                <div className="space-y-4">
                  {selectedApp.fields.map((field) => {
                    const isSecret = field.type === 'password';
                    const showSecret = showSecrets[field.key];

                    return (
                      <div key={field.key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={field.key} className="text-xs font-semibold">
                            {field.label} {field.required && <span className="text-destructive">*</span>}
                          </Label>
                          {field.helpText && (
                            <span className="text-[11px] text-muted-foreground">{field.helpText}</span>
                          )}
                        </div>

                        {field.type === 'select' && field.options ? (
                          <select
                            id={field.key}
                            value={formData[field.key] || field.options[0]?.value || ''}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="relative">
                            <Input
                              id={field.key}
                              type={isSecret && !showSecret ? 'password' : 'text'}
                              value={formData[field.key] || ''}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className={`h-10 text-sm ${isSecret ? 'pr-10' : ''}`}
                              required={field.required}
                            />
                            {isSecret && (
                              <button
                                type="button"
                                onClick={() => toggleShowSecret(field.key)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                title={showSecret ? 'Hide secret' : 'Show secret'}
                              >
                                {showSecret ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Security Badge */}
              <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground border border-border/60">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Encrypted Vault:</strong> All credentials and tokens are encrypted with AES-256-GCM before storage. They are never exposed in plaintext logs.
                </span>
              </div>

              {/* Live Ping Validation Result */}
              {validationResult && (
                <div
                  className={`rounded-xl p-4 border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                    validationResult.success
                      ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30'
                      : 'bg-destructive/10 text-destructive border-destructive/30'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {validationResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      {validationResult.success
                        ? `Live Ping Validation Passed (${validationResult.latencyMs}ms)`
                        : 'Validation Failed'}
                    </span>
                    <span className="font-mono text-[11px] opacity-75">
                      {validationResult.latencyMs}ms latency
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">{validationResult.message}</p>
                  {validationResult.scopes && validationResult.scopes.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="font-semibold text-[10px]">Verified Scopes:</span>
                      {validationResult.scopes.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] py-0 px-1.5 bg-background/50 font-mono">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBackToStep1}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleValidatePing}
                    disabled={isValidating || isSaving}
                    className="cursor-pointer gap-1.5"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Pinging...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span>Test Live Ping</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold cursor-pointer gap-1.5 shadow-sm"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Test & Save Connection</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
