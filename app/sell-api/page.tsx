"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
    DollarSign,
    Package,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Upload,
    Lock,
    Globe,
    Key,
    Tag,
    Settings,
    Shield,
    X
} from "lucide-react"

type AuthType = "header-key" | "query-param" | "oauth2"

const API_CATEGORIES = [
    "Weather", "Finance", "Social Media", "Maps", "AI/ML",
    "Data Analytics", "E-commerce", "Healthcare", "Education",
    "Entertainment", "News", "Transportation", "Other"
]

interface APIFormData {
    apiName: string
    baseEndpoint: string
    apiDescription: string
    documentationUrl: string
    category: string[]
    pricingPerCall: string
    quotaToSell: string
    authType: AuthType
    authParamName: string
    apiKey: string
    apiKeyFile: File | null
    region: string
    metadataUri: string
}

interface FormErrors {
    [key: string]: string
}

// Client-side encryption function (for demo - in production use Web Crypto API)
function encryptApiKey(apiKey: string, salt: string): string {
    // This is a simple encryption for demo purposes
    // In production, use Web Crypto API with proper encryption
    const encoded = btoa(`${salt}:${apiKey}`)
    return encoded
}

export default function SellAPIPage() {
    const router = useRouter()
    const { user } = useAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState<APIFormData>({
        apiName: "",
        baseEndpoint: "",
        apiDescription: "",
        documentationUrl: "",
        category: [],
        pricingPerCall: "",
        quotaToSell: "",
        authType: "header-key",
        authParamName: "",
        apiKey: "",
        apiKeyFile: null,
        region: "",
        metadataUri: ""
    })

    const [errors, setErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [successData, setSuccessData] = useState<{
        dbId: number;
        txHash?: string;
        explorerUrl?: string;
    } | null>(null)
    const [categoryInput, setCategoryInput] = useState("")

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}

        // API Name validation
        if (!formData.apiName.trim()) {
            newErrors.apiName = "API name is required"
        } else if (formData.apiName.length < 3) {
            newErrors.apiName = "API name must be at least 3 characters"
        }

        // Base Endpoint validation
        if (!formData.baseEndpoint.trim()) {
            newErrors.baseEndpoint = "Base endpoint is required"
        } else if (!formData.baseEndpoint.startsWith("http://") && !formData.baseEndpoint.startsWith("https://")) {
            newErrors.baseEndpoint = "Endpoint must be a valid URL (http:// or https://)"
        }

        // Description validation
        if (!formData.apiDescription.trim()) {
            newErrors.apiDescription = "Description is required"
        } else if (formData.apiDescription.length < 20) {
            newErrors.apiDescription = "Description must be at least 20 characters"
        }

        // Category validation
        if (formData.category.length === 0) {
            newErrors.category = "Select at least one category"
        }

        // Pricing validation
        if (!formData.pricingPerCall.trim()) {
            newErrors.pricingPerCall = "Price per call is required"
        } else if (isNaN(Number(formData.pricingPerCall)) || Number(formData.pricingPerCall) <= 0) {
            newErrors.pricingPerCall = "Price must be a positive number"
        }

        // Quota validation
        if (!formData.quotaToSell.trim()) {
            newErrors.quotaToSell = "Quota is required"
        } else if (isNaN(Number(formData.quotaToSell)) || Number(formData.quotaToSell) <= 0) {
            newErrors.quotaToSell = "Quota must be a positive number"
        }

        // Auth parameter name validation
        if (!formData.authParamName.trim()) {
            newErrors.authParamName = "Auth parameter name is required"
        }

        // API Key validation
        if (!formData.apiKey.trim() && !formData.apiKeyFile) {
            newErrors.apiKey = "API key is required (text or file)"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        console.log("Form submitted, validating...")

        if (!user) {
            setErrors({ submit: "You must be logged in to register an API" })
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        const isValid = validateForm()

        if (!isValid) {
            console.log("Validation failed with errors:", errors)
            // Scroll to first error
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        console.log("Validation passed, submitting...")
        setIsSubmitting(true)
        setErrors({})

        try {
            // Step 1: Encrypt API key on client-side
            const salt = Math.random().toString(36).substring(2, 18)
            const encryptedApiKey = encryptApiKey(formData.apiKey, salt)

            console.log("API key encrypted with salt:", salt)

            // Step 2: Prepare submission data
            const submissionData = {
                sellerUID: user.uid,
                apiName: formData.apiName,
                baseEndpoint: formData.baseEndpoint,
                apiDescription: formData.apiDescription,
                documentationUrl: formData.documentationUrl,
                categories: formData.category,
                pricingPerCall: formData.pricingPerCall,
                quotaToSell: formData.quotaToSell,
                authType: formData.authType,
                authParamName: formData.authParamName,
                encryptedApiKey: encryptedApiKey,
                encryptionSalt: salt,
                region: formData.region,
                metadataUri: formData.metadataUri || null
            }

            console.log("Submitting to database...")

            // Step 3: Submit to database
            const response = await fetch('/api/api-registry/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            })

            console.log("Response status:", response.status)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to register API')
            }

            const result = await response.json()
            console.log("Registration successful!", result)

            // Step 4: Show success dialog with details
            setSuccessData({
                dbId: result.data.id,
                // If blockchain integration is added later:
                // txHash: result.txHash,
                // explorerUrl: `https://sepolia.etherscan.io/tx/${result.txHash}`
            })
            setSubmitSuccess(true)

        } catch (error) {
            console.error("Error submitting form:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to submit. Please try again."
            setErrors({ submit: errorMessage })
            // Scroll to top to show error
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleInputChange = (field: keyof APIFormData, value: string | File | null) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error for this field when user starts typing
        if (errors[field]) {
            const newErrors = { ...errors }
            delete newErrors[field]
            setErrors(newErrors)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
                const apiKey = event.target?.result as string
                setFormData(prev => ({ ...prev, apiKey, apiKeyFile: file }))
            }
            reader.readAsText(file)
        }
    }

    const addCategory = (cat: string) => {
        if (cat && !formData.category.includes(cat)) {
            setFormData(prev => ({ ...prev, category: [...prev.category, cat] }))
            setCategoryInput("")
        }
    }

    const removeCategory = (cat: string) => {
        setFormData(prev => ({ ...prev, category: prev.category.filter(c => c !== cat) }))
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-3">Register Your API</h1>
                    <p className="text-muted-foreground text-lg">
                        List your API on the decentralized marketplace
                    </p>
                    <Badge variant="outline" className="mt-4">
                        <Clock className="w-3 h-3 mr-1" />
                        Takes 5-7 minutes
                    </Badge>
                </div>

                {/* Validation Errors Summary */}
                {Object.keys(errors).length > 0 && !errors.submit && (
                    <Card className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3 text-orange-700 dark:text-orange-400">
                                <AlertCircle className="w-5 h-5 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-semibold mb-2">Please fix the following errors:</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        {Object.entries(errors).map(([field, message]) => (
                                            <li key={field}>{message}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Global Error */}
                {errors.submit && (
                    <Card className="mb-6 border-red-500 bg-red-50 dark:bg-red-950/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                                <AlertCircle className="w-5 h-5" />
                                <p>{errors.submit}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Basic Information
                            </CardTitle>
                            <CardDescription>
                                Provide essential details about your API
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* API Name */}
                            <div className="space-y-2">
                                <Label htmlFor="apiName">
                                    API Name *
                                </Label>
                                <Input
                                    id="apiName"
                                    placeholder="e.g., Weather Forecast API"
                                    value={formData.apiName}
                                    onChange={(e) => handleInputChange("apiName", e.target.value)}
                                    className={errors.apiName ? "border-red-500" : ""}
                                />
                                {errors.apiName && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.apiName}
                                    </p>
                                )}
                            </div>

                            {/* Base Endpoint */}
                            <div className="space-y-2">
                                <Label htmlFor="baseEndpoint" className="flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    Base Endpoint URL *
                                </Label>
                                <Input
                                    id="baseEndpoint"
                                    type="url"
                                    placeholder="https://api.example.com/v1"
                                    value={formData.baseEndpoint}
                                    onChange={(e) => handleInputChange("baseEndpoint", e.target.value)}
                                    className={errors.baseEndpoint ? "border-red-500" : ""}
                                />
                                {errors.baseEndpoint && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.baseEndpoint}
                                    </p>
                                )}
                            </div>

                            {/* API Description */}
                            <div className="space-y-2">
                                <Label htmlFor="apiDescription">
                                    API Description *
                                </Label>
                                <Textarea
                                    id="apiDescription"
                                    placeholder="Describe what your API does, its features, use cases, and capabilities..."
                                    value={formData.apiDescription}
                                    onChange={(e) => handleInputChange("apiDescription", e.target.value)}
                                    className={cn("min-h-[120px]", errors.apiDescription ? "border-red-500" : "")}
                                />
                                {errors.apiDescription && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.apiDescription}
                                    </p>
                                )}
                            </div>

                            {/* Documentation URL */}
                            <div className="space-y-2">
                                <Label htmlFor="documentationUrl">
                                    Documentation URL (Optional)
                                </Label>
                                <Input
                                    id="documentationUrl"
                                    type="url"
                                    placeholder="https://docs.example.com/api"
                                    value={formData.documentationUrl}
                                    onChange={(e) => handleInputChange("documentationUrl", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Link to your API documentation
                                </p>
                            </div>

                            {/* Category / Tags */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Categories / Tags *
                                </Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={categoryInput}
                                        onValueChange={(value) => {
                                            addCategory(value)
                                        }}
                                    >
                                        <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                                            <SelectValue placeholder="Select categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {API_CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.category.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.category.map((cat) => (
                                            <Badge key={cat} variant="secondary" className="gap-1">
                                                {cat}
                                                <X
                                                    className="w-3 h-3 cursor-pointer"
                                                    onClick={() => removeCategory(cat)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                {errors.category && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.category}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing & Quota */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Pricing & Quota
                            </CardTitle>
                            <CardDescription>
                                Set your pricing and available quota
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pricing Per Call */}
                                <div className="space-y-2">
                                    <Label htmlFor="pricingPerCall">
                                        Price Per Call (ETH) *
                                    </Label>
                                    <Input
                                        id="pricingPerCall"
                                        type="number"
                                        step="0.000001"
                                        placeholder="e.g., 0.0001"
                                        value={formData.pricingPerCall}
                                        onChange={(e) => handleInputChange("pricingPerCall", e.target.value)}
                                        className={errors.pricingPerCall ? "border-red-500" : ""}
                                        min="0"
                                    />
                                    {errors.pricingPerCall && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.pricingPerCall}
                                        </p>
                                    )}
                                </div>

                                {/* Quota to Sell */}
                                <div className="space-y-2">
                                    <Label htmlFor="quotaToSell" className="flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Quota to Sell (calls) *
                                    </Label>
                                    <Input
                                        id="quotaToSell"
                                        type="number"
                                        placeholder="e.g., 10000"
                                        value={formData.quotaToSell}
                                        onChange={(e) => handleInputChange("quotaToSell", e.target.value)}
                                        className={errors.quotaToSell ? "border-red-500" : ""}
                                        min="1"
                                    />
                                    {errors.quotaToSell && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.quotaToSell}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Calculated Total */}
                            {formData.pricingPerCall && formData.quotaToSell && (
                                <div className="p-4 bg-secondary/50 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Total Value:</span>
                                        <span className="text-lg font-bold">
                                            {(Number(formData.pricingPerCall) * Number(formData.quotaToSell)).toFixed(6)} ETH
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Authentication */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Authentication Configuration
                            </CardTitle>
                            {/* <CardDescription>
                Configure how buyers will authenticate with your API. 
                <a 
                  href="/docs/API_AUTHENTICATION_CONFIG.md" 
                  target="_blank" 
                  className="text-primary underline ml-1"
                >
                  View detailed guide
                </a>
              </CardDescription> */}
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Quick Reference Examples */}
                            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <AlertTitle className="text-blue-900 dark:text-blue-100">Quick Reference</AlertTitle>
                                <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs space-y-2 mt-2">
                                    <div>
                                        <span className="font-semibold">Header Key (Recommended):</span>
                                        <br />
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">curl -H "X-API-Key: YOUR_KEY" https://api.example.com</code>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Query Parameter:</span>
                                        <br />
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">curl "https://api.example.com?api_key=YOUR_KEY"</code>
                                    </div>
                                    <div>
                                        <span className="font-semibold">OAuth 2.0:</span>
                                        <br />
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">curl -H "Authorization: Bearer TOKEN" https://api.example.com</code>
                                    </div>
                                </AlertDescription>
                            </Alert>

                            {/* Auth Type */}
                            <div className="space-y-2">
                                <Label htmlFor="authType" className="flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    Authentication Type *
                                </Label>
                                <Select
                                    value={formData.authType}
                                    onValueChange={(value: AuthType) => handleInputChange("authType", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="header-key">
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium">Header Key</span>
                                                <span className="text-xs text-muted-foreground">Secure - sent in HTTP headers (Recommended)</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="query-param">
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium">Query Parameter</span>
                                                <span className="text-xs text-muted-foreground">Sent in URL - less secure, visible in logs</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="oauth2">
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium">OAuth 2.0</span>
                                                <span className="text-xs text-muted-foreground">Token-based - for enterprise APIs</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Select how buyers will authenticate with your API
                                </p>
                            </div>

                            {/* Auth Parameter Name */}
                            <div className="space-y-2">
                                <Label htmlFor="authParamName">
                                    Auth Parameter Name *
                                </Label>
                                <Input
                                    id="authParamName"
                                    placeholder={
                                        formData.authType === "header-key"
                                            ? "e.g., X-API-Key, Authorization"
                                            : formData.authType === "query-param"
                                                ? "e.g., api_key, apikey, key"
                                                : "e.g., Authorization"
                                    }
                                    value={formData.authParamName}
                                    onChange={(e) => handleInputChange("authParamName", e.target.value)}
                                    className={errors.authParamName ? "border-red-500" : ""}
                                />
                                {errors.authParamName && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.authParamName}
                                    </p>
                                )}
                                <div className="text-xs text-muted-foreground space-y-1">
                                    {formData.authType === "header-key" && (
                                        <>
                                            <p>The name of the header field (case-sensitive)</p>
                                            <p className="flex items-start gap-1">
                                                <span className="font-medium">Examples:</span>
                                                <span>X-API-Key, Authorization, Api-Key</span>
                                            </p>
                                        </>
                                    )}
                                    {formData.authType === "query-param" && (
                                        <>
                                            <p>The name of the URL parameter</p>
                                            <p className="flex items-start gap-1">
                                                <span className="font-medium">Examples:</span>
                                                <span>api_key, apikey, key, token</span>
                                            </p>
                                        </>
                                    )}
                                    {formData.authType === "oauth2" && (
                                        <>
                                            <p>Usually "Authorization" for Bearer tokens</p>
                                            <p className="flex items-start gap-1">
                                                <span className="font-medium">Format:</span>
                                                <span>Authorization: Bearer &lt;token&gt;</span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* API Key Input */}
                            <div className="space-y-2">
                                <Label htmlFor="apiKey" className="flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    Your Master API Key / Secret *
                                </Label>
                                <Textarea
                                    id="apiKey"
                                    placeholder={
                                        formData.authType === "header-key"
                                            ? "Enter your API key (e.g., sk_live_abc123, APIKEY123456)\nThis is YOUR key from the API provider, not for buyers"
                                            : formData.authType === "query-param"
                                                ? "Enter your API key that will be used in the URL\nThis is YOUR key from the API provider, not for buyers"
                                                : "Enter your OAuth credentials (client_id and client_secret)\nThis will be encrypted before submission"
                                    }
                                    value={formData.apiKey}
                                    onChange={(e) => handleInputChange("apiKey", e.target.value)}
                                    className={cn("min-h-[80px] font-mono text-sm", errors.apiKey ? "border-red-500" : "")}
                                />
                                {errors.apiKey && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.apiKey}
                                    </p>
                                )}
                                <div className="space-y-1 text-xs">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <Lock className="w-3 h-3" />
                                        <span className="font-medium">Encrypted client-side before submission</span>
                                    </div>
                                    <div className="text-muted-foreground space-y-1 pl-5">
                                        <p>• This is YOUR master key from the API provider (OpenAI, Stripe, etc.)</p>
                                        <p>• Buyers will get unique sub-keys, never your master key</p>
                                        <p>• Keeper nodes use this to proxy authenticated requests</p>
                                        <p>• Test your key before submitting to ensure it works</p>
                                    </div>
                                </div>
                            </div>

                            {/* Or File Upload */}
                            <div className="space-y-2">
                                <Label>Or Upload API Key File</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".txt,.json,.key"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {formData.apiKeyFile ? formData.apiKeyFile.name : "Upload Key File"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Optional Settings */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                Optional Settings
                            </CardTitle>
                            <CardDescription>
                                Additional configuration options
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Region / Keeper Preference */}
                            <div className="space-y-2">
                                <Label htmlFor="region">
                                    Region / Keeper Preference
                                </Label>
                                <Select
                                    value={formData.region}
                                    onValueChange={(value) => handleInputChange("region", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select preferred region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="us-east">US East</SelectItem>
                                        <SelectItem value="us-west">US West</SelectItem>
                                        <SelectItem value="eu-west">Europe West</SelectItem>
                                        <SelectItem value="eu-central">Europe Central</SelectItem>
                                        <SelectItem value="asia-east">Asia East</SelectItem>
                                        <SelectItem value="asia-south">Asia South</SelectItem>
                                        <SelectItem value="any">Any Region</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Preferred region for keeper nodes to process requests
                                </p>
                            </div>

                            {/* Metadata URI (Auto-filled) */}
                            <div className="space-y-2">
                                <Label htmlFor="metadataUri">
                                    Metadata URI
                                </Label>
                                <Input
                                    id="metadataUri"
                                    placeholder="Will be auto-generated after submission"
                                    value={formData.metadataUri}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This will be automatically generated and updated after submission
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary */}
                    {formData.apiName && formData.pricingPerCall && formData.quotaToSell && (
                        <Card className="mb-6 bg-secondary/50">
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">API Name:</span>
                                        <p className="font-medium">{formData.apiName}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Endpoint:</span>
                                        <p className="font-medium truncate">{formData.baseEndpoint}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Price per Call:</span>
                                        <p className="font-medium">{formData.pricingPerCall} ETH</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Total Quota:</span>
                                        <p className="font-medium">{formData.quotaToSell} calls</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Total Value:</span>
                                        <p className="font-medium text-lg">
                                            {(Number(formData.pricingPerCall) * Number(formData.quotaToSell)).toFixed(6)} ETH
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Auth Type:</span>
                                        <p className="font-medium capitalize">{formData.authType.replace("-", " ")}</p>
                                    </div>
                                </div>
                                {formData.category.length > 0 && (
                                    <div>
                                        <span className="text-sm text-muted-foreground">Categories:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {formData.category.map((cat) => (
                                                <Badge key={cat} variant="outline" className="text-xs">
                                                    {cat}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Submit Buttons */}
                    <Card>
                        <CardFooter className="flex justify-between pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        console.log("Current form data:", formData)
                                        const isValid = validateForm()
                                        console.log("Validation result:", isValid)
                                        console.log("Validation errors:", errors)
                                        alert(isValid ? "✅ Form is valid!" : "❌ Form has errors. Check console for details.")
                                    }}
                                    disabled={isSubmitting}
                                    className="hidden md:flex"
                                >
                                    Test Validation
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="min-w-[140px]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="mr-2">Registering...</span>
                                            <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full" />
                                        </>
                                    ) : (
                                        <>
                                            <Key className="w-4 h-4 mr-2" />
                                            Register API
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </form>

                {/* Info Section */}
                <div className="mt-8 text-center text-sm text-muted-foreground">
                    <p className="flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        Your API credentials are encrypted end-to-end and stored securely
                    </p>
                </div>

                {/* Success Dialog */}
                <Dialog open={submitSuccess} onOpenChange={setSubmitSuccess}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900">
                                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <DialogTitle className="text-center text-2xl">
                                API Registered Successfully!
                            </DialogTitle>
                            <DialogDescription className="text-center">
                                Your API is now active and available on the marketplace.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {successData && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Registration ID</Label>
                                        <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                                            <code className="flex-1 text-sm">#{successData.dbId}</code>
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                Active
                                            </Badge>
                                        </div>
                                    </div>

                                    {successData.txHash && (
                                        <>
                                            <Separator />
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Transaction Hash</Label>
                                                <div className="p-3 bg-secondary rounded-lg">
                                                    <code className="text-xs break-all">{successData.txHash}</code>
                                                </div>
                                            </div>

                                            {successData.explorerUrl && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => window.open(successData.explorerUrl, '_blank')}
                                                >
                                                    <Globe className="w-4 h-4 mr-2" />
                                                    View on Sepolia Etherscan
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                                        <AlertCircle className="h-4 w-4 text-blue-600" />
                                        <AlertTitle className="text-blue-900 dark:text-blue-100">Next Steps</AlertTitle>
                                        <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                                            <ul className="list-disc list-inside space-y-1 mt-2">
                                                <li>Your API is being reviewed by our team</li>
                                                <li>You'll receive a notification once approved</li>
                                                <li>Check your seller dashboard for status updates</li>
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                </>
                            )}
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSubmitSuccess(false)
                                    // Reset form
                                    setFormData({
                                        apiName: "",
                                        baseEndpoint: "",
                                        apiDescription: "",
                                        documentationUrl: "",
                                        category: [],
                                        pricingPerCall: "",
                                        quotaToSell: "",
                                        authType: "header-key",
                                        authParamName: "",
                                        apiKey: "",
                                        apiKeyFile: null,
                                        region: "",
                                        metadataUri: ""
                                    })
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                className="flex-1"
                            >
                                Register Another API
                            </Button>
                            <Button
                                onClick={() => router.push('/seller')}
                                className="flex-1"
                            >
                                Go to Dashboard
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}