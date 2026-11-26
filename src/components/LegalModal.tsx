import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, RefreshCw, Mail, CheckCircle2, Clock, Award } from 'lucide-react';
import { lockBodyScroll } from '../utils/scrollLock';

export type LegalDocType = 'pricing' | 'terms' | 'privacy' | 'refund' | 'contact';

interface LegalModalProps {
  isOpen: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialDoc = 'pricing',
  onClose,
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);

  useEffect(() => {
    if (initialDoc) {
      setActiveDoc(initialDoc);
    }
  }, [initialDoc]);

  // Lock background and html viewport scroll while modal is visible
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-slate-950/45 backdrop-blur-xl touch-none overscroll-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-[32px] border border-white/95 bg-white/95 shadow-[0_24px_64px_rgba(23,43,77,0.22)] backdrop-blur-2xl overflow-hidden text-slate-800 touch-auto overscroll-contain"
        >
          {/* Mobile Sheet Drag Handle */}
          <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-slate-50/80">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          {/* iOS Liquid Glass Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-gradient-to-b from-white to-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3478F6]/10 text-[#3478F6] border border-[#3478F6]/20 shadow-2xs">
                <Shield className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Recall • Legal & Policies</h3>
                <p className="text-[11px] font-semibold text-slate-500">Team Recall • IT & Software SaaS</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              aria-label="Close legal modal"
            >
              <X className="h-4 w-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Modern 5-Column Segmented Tab Grid (Zero Clipping on Any Screen) */}
          <div className="px-3 py-2 border-b border-slate-200/60 bg-[#F4F8FD]/90">
            <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-slate-200/50 border border-white/80 shadow-2xs">
              {[
                { id: 'pricing', label: 'Pricing', icon: CheckCircle2 },
                { id: 'terms', label: 'Terms', icon: FileText },
                { id: 'privacy', label: 'Privacy', icon: Shield },
                { id: 'refund', label: 'Refunds', icon: RefreshCw },
                { id: 'contact', label: 'Contact', icon: Mail },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeDoc === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveDoc(tab.id as LegalDocType)}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-0.5 rounded-xl transition-all cursor-pointer active:scale-95 text-center min-w-0 ${
                      isActive
                        ? 'bg-white text-[#3478F6] font-extrabold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 font-bold hover:bg-white/50'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#3478F6]' : 'text-slate-400'}`} />
                    <span className="text-[10px] sm:text-[11px] leading-none truncate max-w-full">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Body */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 text-xs text-slate-600 space-y-4 leading-relaxed"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          >
            {/* PRICING & PLANS */}
            {activeDoc === 'pricing' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Recall SaaS Pricing & Subscription Plans</h4>
                  <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold border border-emerald-500/20 whitespace-nowrap shrink-0">
                    Transparent Pricing
                  </span>
                </div>
                <p className="text-slate-600">
                  Recall provides transparent, flexible SaaS subscriptions for AI screenshot intelligence and personal visual memory. All paid plans include an instant 7-day risk-free trial.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Free Tier */}
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Free Tier</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold">Standard</span>
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      ₹0 <span className="text-xs font-normal text-slate-500">/ forever</span>
                    </div>
                    <ul className="space-y-1 pt-1 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>50 screenshot vault</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>Standard OCR search</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>5 daily AI lookups</span>
                      </li>
                    </ul>
                  </div>

                  {/* Basic Tier */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Recall Basic</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">10x Storage</span>
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      ₹39 <span className="text-xs font-normal text-slate-500">/ mo</span>
                    </div>
                    <div className="text-[10.5px] font-semibold text-emerald-600">
                      Annual: ₹349/yr (~₹29/mo)
                    </div>
                    <ul className="space-y-1 pt-1 text-[11px] text-slate-700">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0" />
                        <span>500 screenshot vault</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0" />
                        <span>Fast cloud OCR search</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0" />
                        <span>25 daily AI lookups</span>
                      </li>
                    </ul>
                  </div>

                  {/* Pro Tier */}
                  <div className="rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-white to-amber-50/40 p-3.5 space-y-2 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8.5px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-wider">
                      Popular
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Recall Pro</span>
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      ₹77 <span className="text-xs font-normal text-slate-500">/ mo</span>
                    </div>
                    <div className="text-[10.5px] font-semibold text-emerald-600">
                      Annual: ₹700/yr (~₹58/mo)
                    </div>
                    <ul className="space-y-1 pt-1 text-[11px] text-slate-700 font-medium">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>Unlimited vault storage</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>Unlimited AI Vision chat</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>Thread stitcher & broom</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-[11.5px] text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-[#3478F6]" />
                    <span>Instant Digital Service Delivery</span>
                  </div>
                  <p>
                    Recall is 100% cloud SaaS software. Service activation occurs instantaneously upon mandate creation or checkout verification. No physical products or physical courier delivery are involved.
                  </p>
                </div>
              </div>
            )}

            {/* TERMS & CONDITIONS */}
            {activeDoc === 'terms' && (
              <div className="space-y-3.5">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Terms and Conditions</h4>
                <p className="text-[11px] text-slate-500">Effective Date: January 1, 2025 | Last Updated: November 2026</p>

                <div className="space-y-2.5">
                  <div>
                    <h5 className="font-bold text-slate-900">1. Acceptance of Terms</h5>
                    <p>
                      By creating an account, accessing, or subscribing to Recall (<a href="https://recall-pro.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#3478F6] underline">recall-pro.vercel.app</a>), you agree to comply with and be bound by these Terms and Conditions provided by <strong>Team Recall</strong> (Service Provider). If you do not agree, do not use our services.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">2. Service Description</h5>
                    <p>
                      Recall is a personal screenshot search engine and AI productivity tool. Features include image OCR indexing, semantic vector searching, duplicate detection, and visual vault management.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">3. User Accounts & Responsibilities</h5>
                    <p>
                      You must provide accurate contact and authentication credentials. You are solely responsible for maintaining account confidentiality. You agree not to upload content that infringes upon third-party intellectual property or violates applicable Indian or international cyber laws.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">4. Subscriptions & Payments</h5>
                    <p>
                      Paid plans are billed in Indian Rupees (INR) via authorized payment aggregators (Razorpay). By setting up an e-mandate or recurring subscription, you authorize recurring debits until cancelled. All Pro subscriptions include an initial 7-day risk-free trial.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">5. Termination & Cancellation</h5>
                    <p>
                      You may cancel your recurring subscription at any time through the in-app Settings or via your UPI autopay application. Cancellation stops subsequent recurring billing immediately.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">6. Governing Law & Jurisdiction</h5>
                    <p>
                      These Terms are governed by the laws of India. Any disputes arising out of or related to Recall shall be subject to the exclusive jurisdiction of the competent courts in Tamil Nadu, India.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY POLICY */}
            {activeDoc === 'privacy' && (
              <div className="space-y-3.5">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Privacy Policy</h4>
                <p className="text-[11px] text-slate-500">Compliant with the Information Technology Act, 2000 & Digital Personal Data Protection (DPDP) Act</p>

                <div className="space-y-2.5">
                  <div>
                    <h5 className="font-bold text-slate-900">1. Complete Data Ownership</h5>
                    <p>
                      Your screenshot memories, images, extracted text, and search indexes belong exclusively to you. Recall enforces strict per-user cryptographic isolation with row-level database security.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">2. Data We Collect</h5>
                    <p>
                      We collect minimal information necessary to deliver the service: your email address for account authentication, subscription metadata for payment processing, and screenshots you explicitly upload for OCR indexing.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">3. Zero Third-Party Advertising / Data Selling</h5>
                    <p>
                      We do not sell, rent, license, or monetize your screenshot data, search queries, or personal metadata to third-party advertisers or data brokers.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">4. Payment Processing</h5>
                    <p>
                      Payment credentials (credit/debit cards, UPI IDs, netbanking) are securely processed by Razorpay, a certified PCI-DSS Level 1 compliant gateway. Recall does not store your raw card numbers or CVV.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">5. Data Retention & Account Deletion</h5>
                    <p>
                      You have the right to request full deletion of your library, images, and user account at any time. When you trigger deletion, your screenshots and OCR records are permanently purged from our databases.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* REFUND & CANCELLATION */}
            {activeDoc === 'refund' && (
              <div className="space-y-3.5">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Refund & Cancellation Policy</h4>

                <div className="space-y-2.5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <h5 className="font-bold text-emerald-900">7-Day Free Trial Guarantee</h5>
                    <p className="text-emerald-800 text-[11.5px] mt-0.5">
                      Every Recall Pro subscription includes a 7-day risk-free trial. You can cancel at any moment during the first 7 days, and ₹0 will be deducted from your payment source.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">1. How to Cancel</h5>
                    <p>
                      You can cancel your subscription at any time without questions asked:
                    </p>
                    <ul className="list-disc pl-5 pt-1 space-y-1 text-[11.5px]">
                      <li>Directly within the Recall app: Navigate to <strong>Settings → Subscription → Manage / Cancel Plan</strong>.</li>
                      <li>From your UPI App: Open Google Pay, PhonePe, Paytm, or BHIM, go to Autopay / Mandates, and select Pause or Revoke on Recall.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">2. Refund Eligibility</h5>
                    <p>
                      If you experienced technical service failure, unauthorized billing, or were charged erroneously, you are entitled to a full refund if requested within <strong>7 days</strong> of the billing date.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900">3. Processing & Crediting Timeline</h5>
                    <p>
                      Refunds are approved and initiated within 24 to 48 business hours. As per standard Indian banking processing times, the amount will reflect in your source bank account or UPI within <strong>5 to 7 working days</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CONTACT US */}
            {activeDoc === 'contact' && (
              <div className="space-y-3.5">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Contact Us & Support</h4>
                <p>
                  For any support, subscription queries, billing inquiries, or technical feedback, reach out to our dedicated support team directly:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Mail className="h-4 w-4 text-[#3478F6]" />
                      <span>Email Support</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600">
                      Primary:{' '}
                      <a href="mailto:recall.support@gmail.com" className="text-[#3478F6] font-semibold hover:underline">
                        recall.support@gmail.com
                      </a>
                    </p>
                    <p className="text-[11px] text-slate-500">Fast assistance for subscriptions & features</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Clock className="h-4 w-4 text-indigo-500" />
                      <span>Support Hours & SLA</span>
                    </div>
                    <p className="text-[11.5px] text-slate-700">
                      Monday to Saturday<br />
                      9:00 AM – 7:00 PM IST<br />
                      Response time: Within 24-48 hours
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-900">Grievance Redressal Officer</div>
                  <p>
                    <strong>Name:</strong> Team Recall | <strong>Email:</strong> recall.support@gmail.com
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* iOS Liquid Glass Footer */}
          <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/70 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Need assistance?{' '}
              <a href="mailto:recall.support@gmail.com" className="text-[#3478F6] font-semibold hover:underline">
                recall.support@gmail.com
              </a>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 rounded-full bg-[#172B4D] text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
