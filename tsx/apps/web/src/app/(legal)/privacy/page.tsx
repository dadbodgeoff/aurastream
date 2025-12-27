'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-surface rounded-xl shadow-lg p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
          <p className="text-text-secondary mb-8">Last Updated: December 26, 2025</p>
          
          <div className="prose prose-invert max-w-none space-y-8 text-text-secondary">
            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">1. Introduction</h2>
              <p>
                1v1Bro LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), located at Providence, Rhode Island, 
                United States, operates AuraStream (&quot;Service&quot;). This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our Service.
              </p>
              <p>
                By using the Service, you consent to the data practices described in this Privacy Policy. 
                If you do not agree with the terms of this Privacy Policy, please do not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-text-primary mb-2">2.1 Personal Information You Provide</h3>
              <p>We collect information you voluntarily provide when using the Service:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email address, display name, password (hashed)</li>
                <li><strong>Profile Information:</strong> Avatar image, bio, preferences</li>
                <li><strong>Payment Information:</strong> Billing address, payment method details (processed by Stripe)</li>
                <li><strong>Brand Kit Data:</strong> Colors, fonts, logos, brand guidelines you configure</li>
                <li><strong>Generated Content:</strong> Prompts, generated assets, customization preferences</li>
                <li><strong>Communications:</strong> Support requests, feedback, survey responses</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">2.2 Information Collected Automatically</h3>
              <p>When you access the Service, we automatically collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Device Information:</strong> Device type, operating system, browser type and version</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns</li>
                <li><strong>Log Data:</strong> IP address, access times, referring URLs, error logs</li>
                <li><strong>Analytics Data:</strong> Session duration, feature engagement, conversion events</li>
                <li><strong>Performance Data:</strong> Load times, error rates, API response times</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">2.3 Information from Third Parties</h3>
              <p>We may receive information from third-party services you connect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>OAuth Providers:</strong> Google, Twitch, Discord (profile information, email)</li>
                <li><strong>Platform Integrations:</strong> Twitch channel data, YouTube channel information</li>
                <li><strong>Payment Processor:</strong> Transaction status, payment confirmation from Stripe</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">3. How We Use Your Information</h2>
              <p>We use collected information for the following purposes:</p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">3.1 Service Delivery</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create and manage your account</li>
                <li>Process asset generation requests</li>
                <li>Store and deliver generated assets</li>
                <li>Provide customer support</li>
                <li>Process payments and subscriptions</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">3.2 Service Improvement</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analyze usage patterns to improve features</li>
                <li>Train and improve AI models (using anonymized data)</li>
                <li>Identify and fix bugs and performance issues</li>
                <li>Develop new features and services</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">3.3 Communication</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send transactional emails (account verification, password reset)</li>
                <li>Notify you of service updates and changes</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Respond to support inquiries</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">3.4 Security and Compliance</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Detect and prevent fraud and abuse</li>
                <li>Enforce our Terms of Service</li>
                <li>Comply with legal obligations</li>
                <li>Protect the rights and safety of users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">4. Data Sharing and Disclosure</h2>
              
              <h3 className="text-lg font-medium text-text-primary mb-2">4.1 Service Providers</h3>
              <p>We share data with third-party service providers who assist in operating our Service:</p>
              <table className="w-full mt-4 border-collapse">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left py-2 text-text-primary">Provider</th>
                    <th className="text-left py-2 text-text-primary">Purpose</th>
                    <th className="text-left py-2 text-text-primary">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-border-default">
                    <td className="py-2">Supabase</td>
                    <td className="py-2">Database & Authentication</td>
                    <td className="py-2">Account data, assets, brand kits</td>
                  </tr>
                  <tr className="border-b border-border-default">
                    <td className="py-2">Stripe</td>
                    <td className="py-2">Payment Processing</td>
                    <td className="py-2">Billing info, transaction data</td>
                  </tr>
                  <tr className="border-b border-border-default">
                    <td className="py-2">Redis (Upstash)</td>
                    <td className="py-2">Caching & Sessions</td>
                    <td className="py-2">Session tokens, analytics events</td>
                  </tr>
                  <tr className="border-b border-border-default">
                    <td className="py-2">OpenAI/Anthropic</td>
                    <td className="py-2">AI Generation</td>
                    <td className="py-2">Prompts, generation parameters</td>
                  </tr>
                  <tr className="border-b border-border-default">
                    <td className="py-2">AWS/Cloudflare</td>
                    <td className="py-2">CDN & Storage</td>
                    <td className="py-2">Generated assets, static files</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">4.2 Legal Requirements</h3>
              <p>We may disclose your information if required to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comply with applicable laws, regulations, or legal processes</li>
                <li>Respond to lawful requests from public authorities</li>
                <li>Protect our rights, privacy, safety, or property</li>
                <li>Enforce our Terms of Service</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">4.3 Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred 
                to the acquiring entity. We will notify you of any such change and any choices you may have.
              </p>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">4.4 With Your Consent</h3>
              <p>
                We may share your information with third parties when you have given us explicit consent to do so.
              </p>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">4.5 What We Do NOT Share</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>We do not sell your personal information to third parties</li>
                <li>We do not share your data with advertisers for targeted advertising</li>
                <li>We do not provide your data to data brokers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">5. Data Retention</h2>
              <p>We retain your information for the following periods:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Data:</strong> Until account deletion, plus 30 days for backup recovery</li>
                <li><strong>Generated Assets:</strong> Until you delete them or close your account</li>
                <li><strong>Analytics Data:</strong> Aggregated for 24 months, then anonymized</li>
                <li><strong>Log Data:</strong> 90 days for security and debugging purposes</li>
                <li><strong>Payment Records:</strong> 7 years for tax and legal compliance</li>
                <li><strong>Support Communications:</strong> 3 years after resolution</li>
              </ul>
              <p className="mt-4">
                After account deletion, we may retain anonymized, aggregated data that cannot be used to 
                identify you for analytical and improvement purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">6. Data Security</h2>
              <p>We implement industry-standard security measures to protect your data:</p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">6.1 Technical Safeguards</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>TLS/SSL encryption for all data in transit</li>
                <li>AES-256 encryption for sensitive data at rest</li>
                <li>Secure password hashing using bcrypt with salt</li>
                <li>JWT tokens with short expiration for authentication</li>
                <li>CSRF protection for state-changing requests</li>
                <li>Rate limiting to prevent brute force attacks</li>
                <li>Row-Level Security (RLS) in database</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">6.2 Organizational Safeguards</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access controls limiting data access to authorized personnel</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Employee training on data protection practices</li>
                <li>Incident response procedures for data breaches</li>
              </ul>

              <p className="mt-4">
                While we strive to protect your information, no method of transmission over the Internet 
                or electronic storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">7. Your Rights and Choices</h2>
              
              <h3 className="text-lg font-medium text-text-primary mb-2">7.1 Access and Portability</h3>
              <p>
                You have the right to request a copy of your personal data in a structured, commonly used, 
                machine-readable format.
              </p>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">7.2 Correction</h3>
              <p>
                You can update your account information at any time through your account settings. 
                You may also contact us to correct inaccurate data.
              </p>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">7.3 Deletion</h3>
              <p>
                You can delete your account at any time through account settings. Upon deletion, we will 
                remove your personal data within 30 days, except as required for legal compliance.
              </p>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">7.4 Marketing Opt-Out</h3>
              <p>
                You can opt out of marketing communications by clicking the unsubscribe link in any 
                marketing email or updating your preferences in account settings.
              </p>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">7.5 Cookie Preferences</h3>
              <p>
                You can manage cookie preferences through your browser settings. Note that disabling 
                certain cookies may affect Service functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in the United States, where our servers 
                are located. By using the Service, you consent to this transfer.
              </p>
              <p className="mt-4">
                For users in the European Economic Area (EEA), United Kingdom, or Switzerland, we rely on 
                Standard Contractual Clauses approved by the European Commission for international data transfers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">9. California Privacy Rights (CCPA)</h2>
              <p>California residents have additional rights under the California Consumer Privacy Act:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to Know:</strong> Request disclosure of personal information collected</li>
                <li><strong>Right to Delete:</strong> Request deletion of personal information</li>
                <li><strong>Right to Opt-Out:</strong> Opt out of the sale of personal information (we do not sell data)</li>
                <li><strong>Right to Non-Discrimination:</strong> Equal service regardless of privacy choices</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us at{' '}
                <a href="mailto:Geoffrey@1v1bro.online" className="text-interactive-600 hover:text-interactive-500">
                  Geoffrey@1v1bro.online
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">10. European Privacy Rights (GDPR)</h2>
              <p>If you are in the EEA, UK, or Switzerland, you have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right of Access:</strong> Obtain confirmation of data processing and access to your data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="mt-4">
                Our legal bases for processing include: contract performance, legitimate interests, 
                consent, and legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">11. Children&apos;s Privacy</h2>
              <p>
                The Service is not intended for users under 18 years of age. We do not knowingly collect 
                personal information from children under 18. If we become aware that we have collected 
                personal information from a child under 18, we will take steps to delete such information.
              </p>
              <p className="mt-4">
                If you believe we have collected information from a child under 18, please contact us 
                immediately at{' '}
                <a href="mailto:Geoffrey@1v1bro.online" className="text-interactive-600 hover:text-interactive-500">
                  Geoffrey@1v1bro.online
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">12. Cookies and Tracking Technologies</h2>
              <p>We use the following types of cookies and tracking technologies:</p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">12.1 Essential Cookies</h3>
              <p>Required for basic Service functionality:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Authentication tokens (session management)</li>
                <li>CSRF tokens (security)</li>
                <li>User preferences (theme, language)</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">12.2 Analytics Cookies</h3>
              <p>Help us understand how users interact with the Service:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Page views and navigation patterns</li>
                <li>Feature usage statistics</li>
                <li>Performance metrics</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">12.3 Functional Cookies</h3>
              <p>Enable enhanced functionality:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Remember your preferences</li>
                <li>Personalize your experience</li>
                <li>Store recent activity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">13. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes 
                by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
              </p>
              <p className="mt-4">
                For significant changes, we will provide additional notice via email or through the Service. 
                Your continued use of the Service after changes become effective constitutes acceptance of 
                the revised Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">14. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-4 p-4 bg-background-elevated rounded-lg">
                <p><strong>1v1Bro LLC</strong></p>
                <p>Providence, Rhode Island, United States</p>
                <p>
                  Email:{' '}
                  <a href="mailto:Geoffrey@1v1bro.online" className="text-interactive-600 hover:text-interactive-500">
                    Geoffrey@1v1bro.online
                  </a>
                </p>
                <p className="mt-2 text-sm">
                  For data protection inquiries, please include &quot;Privacy Request&quot; in the subject line.
                </p>
              </div>
            </section>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border-default">
            <Link 
              href="/signup" 
              className="inline-flex items-center text-interactive-600 hover:text-interactive-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
