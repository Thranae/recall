import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, RefreshCw, Mail, CheckCircle2 } from 'lucide-react';

export type LegalDocType = 'terms' | 'privacy' | 'refund' | 'contact' | 'pricing';

interface LegalModalProps {
  isOpen: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialDoc = 'terms',
  onClose,
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-[28px] border border-white/80 bg-white/95 shadow-2xl backdrop-blur-xl overflow-hidden text-slate-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3478F6]/10 text-[#3478F6]">
                <Shield className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recall • Legal & Policies</h3>
                <p className="text-[11px] font-medium text-slate-500">Samy Thranaeswanth • IT & Software SaaS</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/60 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              <X className="h-4 w-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-slate-100 bg-white/60 no-scrollbar">
            {[
              { id: 'pricing', label: 'Pricing & Plans', icon: CheckCircle2 },
              { id: 'terms', label: 'Terms & Conditions', icon: FileText },
              { id: 'privacy', label: 'Privacy Policy', icon: Shield },
              { id: 'refund', label: 'Refund & Cancellation', icon: RefreshCw },
              { id: 'contact', label: 'Contact Us', icon: Mail },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeDoc === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDoc(tab.id as LegalDocType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#3478F6] text-white shadow-xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 stroke-[2.2]" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs text-slate-600 space-y-4 leading-relaxed">
            {activeDoc === 'pricing' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Recall Subscription Plans & Pricing</h4>
                <p>
                  Recall offers flexible, transparent SaaS pricing for screenshot intelligence and visual memory. All paid plans include a 7-day risk-free trial.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Free Tier</span>
                    <div className="text-xl font-extrabold text-slate-900">₹0 <span className="text-xs font-normal text-slate-500">/ forever</span></div>
                    <ul className="space-y-1.5 pt-2 text-[11.5px] text-slate-600">
                      <li>• Up to 50 screenshots vault storage</li>
                      <li>• Standard OCR keyword search</li>
                      <li>• Basic album organization</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-[#3478F6]/30 bg-[#3478F6]/5 p-4 space-y-2 relative">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#3478F6]">Recall Pro (Recommended)</span>
                    <div className="text-xl font-extrabold text-slate-900">
                      ₹1,499 <span className="text-xs font-normal text-slate-500">/ year</span>
                      <span className="block text-[11px] font-medium text-emerald-600">or ₹149 / month</span>
                    </div>
                    <ul className="space-y-1.5 pt-2 text-[11.5px] text-slate-700 font-medium">
                      <li>• 7-Day Free Trial (₹0 due today)</li>
                      <li>• Unlimited screenshot vault</li>
                      <li>• Deep semantic & AI visual search</li>
                      <li>• UPI Autopay / e-Mandate support</li>
                    </ul>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-2">
                  Service Delivery: Digital SaaS service is activated instantly upon subscription creation. No physical shipment is required.
                </p>
              </div>
            )}

            {activeDoc === 'terms' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Terms and Conditions</h4>
                <p><strong>1. Introduction:</strong> Welcome to Recall. By accessing or using our website and SaaS application operated by Samy Thranaeswanth, you agree to be bound by these Terms and Conditions.</p>
                <p><strong>2. Services:</strong> Recall provides intelligent visual search, OCR indexing, and secure cloud storage for personal screenshot histories.</p>
                <p><strong>3. User Accounts:</strong> You are responsible for safeguarding your credentials and any activity conducted under your account. You agree not to upload illegal, harmful, or copyright-infringing content.</p>
                <p><strong>4. Subscription & Billing:</strong> Subscriptions are billed on a recurring monthly or annual basis via verified Indian payment aggregators (including UPI Autopay and cards). You authorize recurring deductions as set up during mandate creation.</p>
                <p><strong>5. Termination:</strong> You may cancel your subscription at any time via your account Settings. Upon cancellation, your Pro perks remain active until the end of your billing cycle.</p>
              </div>
            )}

            {activeDoc === 'privacy' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Privacy Policy</h4>
                <p><strong>1. Data Ownership:</strong> Your screenshot memories and uploaded media belong exclusively to you. Recall enforces strict end-to-end user isolation with row-level security.</p>
                <p><strong>2. Information We Collect:</strong> We collect your account email address, authentication metadata, and screenshot images you choose to upload for OCR indexing and personal search.</p>
                <p><strong>3. Use of Information:</strong> Collected data is used solely to provide screenshot search and indexing features. We never sell, rent, or trade your data to third parties.</p>
                <p><strong>4. Data Storage & Security:</strong> All data is securely stored and transmitted using TLS 1.3 encryption following RBI data localization and cloud industry security guidelines.</p>
              </div>
            )}

            {activeDoc === 'refund' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Refund and Cancellation Policy</h4>
                <p><strong>1. Free Trial Cancellation:</strong> All Recall Pro subscriptions include a 7-day risk-free trial. You may cancel your UPI Autopay mandate at any time during the 7-day trial period without incurring any charge (₹0 deducted).</p>
                <p><strong>2. Post-Trial Subscription Cancellation:</strong> You can cancel your active subscription or autopay mandate anytime through the Settings page or via your UPI app (Google Pay, PhonePe, Paytm). Cancellation halts future auto-deductions immediately.</p>
                <p><strong>3. Refund Requests:</strong> If you experience technical defects or were charged erroneously, you are eligible for a full refund within 7 days of the charge. To request a refund, email our support team with your transaction details.</p>
                <p><strong>4. Processing Timeline:</strong> Approved refunds are credited back to the original payment source within 5 to 7 business days as per banking standards.</p>
              </div>
            )}

            {activeDoc === 'contact' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Contact Us</h4>
                <p>We are here to support your questions regarding subscriptions, technical support, or billing:</p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
                  <div><strong>Legal Entity:</strong> Samy Thranaeswanth</div>
                  <div><strong>Business Category:</strong> IT and Software SaaS</div>
                  <div><strong>Product Name:</strong> Recall (recall-pro.vercel.app)</div>
                  <div><strong>Support Email:</strong> contact@recall-pro.vercel.app / thranae.dev@gmail.com</div>
                  <div><strong>Operating Country:</strong> India</div>
                  <div><strong>Response Time:</strong> Within 24-48 business hours</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Close */}
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-slate-900 text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
