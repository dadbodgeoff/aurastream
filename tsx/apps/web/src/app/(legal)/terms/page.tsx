'use client';

import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-surface rounded-xl shadow-lg p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Terms of Service</h1>
          <p className="text-text-secondary mb-8">Last Updated: December 26, 2025</p>
          
          <div className="prose prose-invert max-w-none space-y-8 text-text-secondary">
            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">1. Agreement to Terms</h2>
              <p>
                By accessing or using AuraStream (&quot;Service&quot;), operated by 1v1Bro LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), 
                located at Providence, Rhode Island, United States, you agree to be bound by these Terms of Service 
                (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
              </p>
              <p>
                These Terms constitute a legally binding agreement between you and the Company regarding your use of 
                the Service. You represent that you are at least 18 years of age, or the age of legal majority in 
                your jurisdiction, and have the legal capacity to enter into these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">2. Description of Service</h2>
              <p>
                AuraStream is an AI-powered asset generation platform designed for content creators, including but 
                not limited to Twitch streamers, YouTubers, and social media influencers. The Service provides:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI-generated streaming assets (emotes, badges, banners, overlays, thumbnails)</li>
                <li>Brand kit management and customization tools</li>
                <li>Prompt coaching and optimization assistance</li>
                <li>Asset storage and management capabilities</li>
                <li>Integration with third-party platforms (Twitch, YouTube, etc.)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">3. Account Registration and Security</h2>
              <h3 className="text-lg font-medium text-text-primary mb-2">3.1 Account Creation</h3>
              <p>
                To access certain features of the Service, you must create an account. You agree to provide accurate, 
                current, and complete information during registration and to update such information to keep it 
                accurate, current, and complete.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">3.2 Account Security</h3>
              <p>
                You are responsible for safeguarding your account credentials and for all activities that occur under 
                your account. You must immediately notify us at{' '}
                <a href="mailto:Geoffrey@1v1bro.online" className="text-interactive-600 hover:text-interactive-500">
                  Geoffrey@1v1bro.online
                </a>{' '}
                of any unauthorized use of your account or any other breach of security.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">3.3 Account Termination</h3>
              <p>
                We reserve the right to suspend or terminate your account at any time for any reason, including but 
                not limited to violation of these Terms, fraudulent activity, or extended periods of inactivity.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">4. Subscription Plans and Payment</h2>
              <h3 className="text-lg font-medium text-text-primary mb-2">4.1 Subscription Tiers</h3>
              <p>The Service offers the following subscription tiers:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Free Tier:</strong> Limited access to basic features with usage restrictions</li>
                <li><strong>Pro Tier:</strong> Enhanced features with increased generation limits</li>
                <li><strong>Studio Tier:</strong> Full access to all features including Prompt Coach and priority support</li>
              </ul>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">4.2 Billing and Payment</h3>
              <p>
                Paid subscriptions are billed in advance on a monthly or annual basis. All payments are processed 
                through Stripe, our third-party payment processor. By subscribing, you authorize us to charge your 
                designated payment method for all applicable fees.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">4.3 Refund Policy</h3>
              <p>
                Subscription fees are non-refundable except as required by applicable law. If you cancel your 
                subscription, you will continue to have access to paid features until the end of your current 
                billing period.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">4.4 Price Changes</h3>
              <p>
                We reserve the right to modify subscription prices at any time. Price changes will be communicated 
                at least 30 days in advance and will take effect at the start of your next billing cycle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">5. Intellectual Property Rights</h2>
              <h3 className="text-lg font-medium text-text-primary mb-2">5.1 Service Content</h3>
              <p>
                The Service, including its original content, features, and functionality, is owned by the Company 
                and is protected by international copyright, trademark, patent, trade secret, and other intellectual 
                property laws.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">5.2 User-Generated Content</h3>
              <p>
                You retain ownership of any content you create using the Service (&quot;User Content&quot;). By using the 
                Service, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, 
                and display your User Content solely for the purpose of operating and improving the Service.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">5.3 AI-Generated Assets</h3>
              <p>
                Assets generated through our AI systems are licensed to you for commercial and personal use, subject 
                to the following conditions:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You may use generated assets for streaming, social media, and content creation</li>
                <li>You may not resell or redistribute generated assets as standalone products</li>
                <li>You may not use generated assets to train competing AI models</li>
                <li>You must comply with platform-specific guidelines (Twitch, YouTube, etc.)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">6. Acceptable Use Policy</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Generate content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
                <li>Create content that infringes on intellectual property rights of third parties</li>
                <li>Generate content depicting minors in any inappropriate context</li>
                <li>Produce content that promotes violence, discrimination, or hate speech</li>
                <li>Create deepfakes or misleading content intended to deceive</li>
                <li>Circumvent or attempt to circumvent usage limits or security measures</li>
                <li>Use automated systems or bots to access the Service without authorization</li>
                <li>Reverse engineer, decompile, or attempt to extract source code from the Service</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">7. Third-Party Services and Integrations</h2>
              <p>
                The Service may integrate with or contain links to third-party services, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Twitch (streaming platform integration)</li>
                <li>YouTube (content platform integration)</li>
                <li>Stripe (payment processing)</li>
                <li>Supabase (data storage and authentication)</li>
                <li>OpenAI/Anthropic (AI model providers)</li>
                <li>Redis (caching and session management)</li>
              </ul>
              <p className="mt-4">
                Your use of third-party services is subject to their respective terms of service and privacy policies. 
                We are not responsible for the content, privacy practices, or availability of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">8. Data Processing and Privacy</h2>
              <p>
                Your privacy is important to us. Our collection and use of personal information is governed by our{' '}
                <Link href="/privacy" className="text-interactive-600 hover:text-interactive-500">
                  Privacy Policy
                </Link>
                , which is incorporated into these Terms by reference.
              </p>
              <p className="mt-4">
                By using the Service, you consent to the collection, processing, and storage of your data as 
                described in our Privacy Policy, including the transfer of data to servers located in the United States.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">9. Disclaimers and Limitations of Liability</h2>
              <h3 className="text-lg font-medium text-text-primary mb-2">9.1 Service Availability</h3>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">9.2 AI-Generated Content</h3>
              <p>
                We do not guarantee the accuracy, quality, or appropriateness of AI-generated content. You are 
                solely responsible for reviewing and approving all generated assets before use.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">9.3 Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, 
                USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
              </p>
              <p className="mt-4">
                IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS 
                PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">10. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless the Company and its officers, directors, employees, 
                agents, and affiliates from and against any claims, liabilities, damages, losses, costs, or expenses 
                (including reasonable attorneys&apos; fees) arising out of or related to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Your User Content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">11. Dispute Resolution</h2>
              <h3 className="text-lg font-medium text-text-primary mb-2">11.1 Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of Rhode Island, 
                United States, without regard to its conflict of law provisions.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">11.2 Arbitration</h3>
              <p>
                Any dispute arising out of or relating to these Terms or the Service shall be resolved through binding 
                arbitration in Providence, Rhode Island, in accordance with the rules of the American Arbitration 
                Association. The arbitrator&apos;s decision shall be final and binding.
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4">11.3 Class Action Waiver</h3>
              <p>
                YOU AGREE THAT ANY CLAIMS MUST BE BROUGHT IN YOUR INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR 
                CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">12. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Material changes will be communicated via 
                email or through the Service at least 30 days before they take effect. Your continued use of the 
                Service after changes become effective constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">13. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be 
                limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain 
                in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">14. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy and any other agreements expressly incorporated by 
                reference, constitute the entire agreement between you and the Company regarding the Service and 
                supersede all prior agreements and understandings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-primary mb-4">15. Contact Information</h2>
              <p>For questions about these Terms, please contact us at:</p>
              <div className="mt-4 p-4 bg-background-elevated rounded-lg">
                <p><strong>1v1Bro LLC</strong></p>
                <p>Providence, Rhode Island, United States</p>
                <p>
                  Email:{' '}
                  <a href="mailto:Geoffrey@1v1bro.online" className="text-interactive-600 hover:text-interactive-500">
                    Geoffrey@1v1bro.online
                  </a>
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
