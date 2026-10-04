Changes

[General changes]
- Added a switch button on the navbar that allows users to switch between freelancer and client, switch should apply for all pages
- Fixed a bug where the release funds button was not showing up for the client side of the website
- The freelancer now has the ability to withdraw and edit a proposal he has that hasnt been accepted yet

[Stricter seperation on Freelancers and clients]
- Made it so that freelancers can not post jobs in the explore jobs page
- Made it so that clients can no longer bid on the jobs they posted themselves
- Bidding is now only available to freelancers
- The dashboard is now mode specific, client mode only shows contracts where you are the client, proposals waiting for your review, and escrow funded. Freelancer mode now show only contracts where you're the freelancer, your active bids, and earnings.

[Cosmetic Changes]
- Gave freelancer and client their own look with a color palette swap, freelancer looks the same but client has a new palette

[Database changes]
- Added a withdrawn status to proposals table

Changes 2

[General changes]
- There are now badges in the job cards that says either accepted, rejected, or applied
- Profile pictures now exist
- Added a rating system for both freelancers and clients

[Database changes]
- Added fields to support profile pictures
- Added stuff to support the rating system


Changes 3

[General Changes]
- Added a top users page, now top freelancers and clients can be displayed
- Added a messaging functionality

[User Profile changes]
- There is now an average price for both freelancers and clients, this is used in the top users page

[Job Changes]
- There is now a fully functioning milestone feature, integrated with the Messaging feature

[Database changes]
- Schema.sql now has content
- Edited the db to support the messaging feature including RLS and Buckets


Changes 4

[External API & Financials]
- Integrated a live Third-Party Forex Currency API (open.er-api.com with server caching and graceful fallback)
- Added a currency selector in the navigation bar supporting PHP (₱), USD ($), EUR (€), JPY (¥), GBP (£), and SGD (S$)
- Explore job card budgets and Dashboard escrow metrics now recalculate in real time based on live exchange rates

[Search & Filtering Improvements]
- Upgraded the Explore search filter to search across both job titles and job categories
- Made category badges on job cards clickable so users can instantly filter jobs by category

[Mobile Responsiveness & UI Polish]
- Added a sticky header with a mobile hamburger navigation drawer
- Added a mobile slide-over filter modal for Explore
- Fixed mobile table overflow with smooth horizontal scrolling for Dashboard contracts and active bids
- Restored the official rocket logo SVG with responsive scaling and hover wiggle animation


Changes 5


[Legal & Compliance System]
- Added interactive Legal Document Viewer (`LegalDocViewer.jsx`), `LegalModal.jsx`, and a dedicated `/legal` route
- Integrated comprehensive legal documents covering Terms of Service, Privacy Policy, and Community Guidelines with in-app tabbed browsing
- Added legal acceptance checkboxes and interactive preview modals directly within the registration flow

[Registration & Onboarding Roadmap Fulfilled]
- Implemented Philippine Standard Geographic Code (PSGC) cascaded address selectors (Region, Province, City/Municipality, Barangay)
- Added dedicated Freelancer onboarding requiring phone number, bank name, and bank account number for payouts
- Added dedicated Client onboarding allowing users to classify as Small Business or Major Contractor with mandatory Business Name input
- Added password strength indicators, real-time input sanitization, and inline validation

[Authentication & Quick Demo Access]
- Added one-click "Demo Customer" and "Demo Freelancer" guest login buttons for instant platform testing
- Enforced strict customer mode guard on `/jobs/create` and `/my-jobs` with automatic redirect upon role switch

[Dark Mode & Visual Polish]
- Integrated platform-wide Dark Mode with persistent theme switching and role-adaptive contrast
- Added animated floating loading toast with a progress bar when toggling between Freelancer and Client modes
- Added velocity-aware floating Back-To-Top button for fast navigation on long feeds
- Polished badge contrasts, status pills, and empty states across Dashboard, Profile, and Explore pages

[Anti-Slop Sanitization & Platform QA]
- Built centralized anti-slop filter (`slopFilter.js`) preventing script injection, excessive uppercase shouting (>70%), repetitive spam text, off-platform contact leaks (emails, phones, Discord/Telegram), and troll budgets
- Enforced strict inline validation across job postings, proposals, contracts, reviews, and dispute tickets

[Contracts, Milestones & Deliverables]
- Added deliverable submission modal supporting both fixed-price contracts and milestone-based work with URL validation
- Added escrow pre-warning modal with clear financial breakdown before releasing funds
- Added milestone decimal budget support and automated deliverable notification alerts inside contract chat threads

[Explore & Discovery Enhancements]
- Pre-cached job categories in memory for instant, zero-flicker filter dropdowns
- Added custom category input when "Others" is selected, with matching dropdown filters on Explore
- Made job card titles directly clickable and added labeled action buttons, proposal character counters, and chat image previews

[Deployment & Tunnels]
- Integrated ngrok tunnel automation for instant background deployment and public verification


Changes 6

[Job Changes]
- Clients can now edit, pause, resume, and cancel their own job postings from the job's proposals page, as long as no freelancer has been accepted yet
- Editing reuses the Post a Job form; budget, budget type, and currency are locked once the job has pending proposals so nobody's bid ends up on changed terms
- Paused jobs are hidden from Explore and don't take new proposals, but the client can still accept or reject the proposals already sent
- Cancelling a job hides it from Explore for good and automatically rejects all its pending proposals
- Paused, cancelled, and removed jobs no longer show up on Explore
- Freelancers who open a paused, cancelled, taken, or removed job now see a "Not accepting proposals" notice instead of the proposal form
- Fixed a bug where any failed proposal submission would wrongly show "Already Applied"

[Admin Changes]
- Added an Admin Panel link to the sidebar for admin accounts, and moved the admin dashboard into the same layout as the rest of the site
- Added a Job Moderation table to the admin dashboard with search and a status filter
- Admins can now take down open or paused jobs with a reason; the client sees the reason on their posting and its pending proposals are rejected
- The Resolve Dispute window now has an Open contract chat button so admins can read the conversation before deciding
- Resolving a dispute now posts the outcome and the admin's notes into the contract chat so both parties see it
- Fixed a bug where resolution notes never showed on resolved disputes

[Database changes]
- Accepting a proposal now also works on paused jobs (004_allow_accept_on_paused_jobs.sql)
- Added a removed status and a removal_reason column to the jobs table (005_add_job_removal.sql)


Changes 7

[Dispute Changes]
- Restored the Dispute button on Dashboard contracts (active or under review), which was lost during the UI redesign

[Registration Fixes]
- Fixed a bug where everything entered in step 2 of registration was thrown away after sign-up
- Freelancer professional title, hourly rate, and location (city and region) are now saved with the new account and show up on their profile
- Client company name is now saved with the new account
- Step 2 details are now checked before the account is created (no HTML, length limits, valid hourly rate)

[Profile Fixes]
- Removed the placeholder 4.8 rating that showed on every profile
- Profiles now show the real freelancer rating from client reviews along with the number of reviews, or "No reviews" if there are none

[Security & Database changes]
- Closed direct public access to the proposals table, which anyone could read, edit, or delete without logging in (006_tighten_proposals_and_jobs_rls.sql)
- Users can no longer create jobs or proposals directly through the database, bypassing the site's validation
- Paused, cancelled, and removed jobs are no longer publicly readable through the database

[Notifications]
- Added a notification bell to the top bar with an unread count
- Clicking the bell shows the latest 20 notifications; clicking one opens the related page and marks it as read, and there is a "Mark all as read" option
- Each notification is tagged Client or Freelancer so users see everything from both modes
- Clients are notified about new proposals, submitted work and milestone stages, disputes filed against them, resolved disputes, and admin takedowns of their jobs (with the reason)
- Freelancers are notified when their proposal is accepted or declined, when a job they applied to is cancelled or taken down, when their work or milestone stage is approved and paid, and about disputes on their contracts
- The bell checks for new notifications every 30 seconds and whenever the user changes pages
- Added a notifications table, only accessible through the backend (007_add_notifications.sql)

[Fixes after the UI redesign]
- Fixed the login and register pages turning completely white (the new dark mode toggle was using a value that didn't exist)
- Fixed light mode on the login and register pages, where text and the RaketBase logo blended into the background; both pages now have proper light and dark colors
- Brought back rating after a contract: completed contracts on the Dashboard have a Rate button that opens a pop-up with overall stars, three role-specific criteria, and an optional comment, and shows "You rated X" afterwards
- The person being rated now gets a notification
- Fixed live chat: new messages appear instantly again instead of only after refreshing
- Brought back the currency selector in the top bar (PHP, USD, EUR, JPY, GBP, SGD) using live exchange rates from the external rates API
- All displayed amounts across the site convert to the chosen currency, shown as an estimate (for example "≈ €126") with the original amount on hover; posting jobs and bidding still use the job's own currency
- Brought back "Job taken" on Explore: assigned and completed jobs show a "Job taken" badge and can no longer be applied to from the card, with a "Hide taken jobs" filter
- Brought back freelancer ratings on proposals: clients see each applicant's star rating and number of reviews, or "No reviews yet"
- Replaced "Top Freelancers" in the sidebar with "Browse Users", a page for browsing every freelancer and client
- Browse Users has Freelancers and Clients tabs (anyone active in that role can appear in either), search by name, company, or skill, and sorting by top rated, most reviews, or newest members
- Each profile card shows the person's average star rating and number of reviews, their average rate (average amount of their completed contracts), and their latest 3 reviews
- A "Top users" button on the same page switches to the ranked leaderboard; old Top Users links now open this view
- Fixed the Top Users leaderboard showing 0.0 stars, 0 reviews, and ₱0 for everyone


Changes 8

[Forgot Password & Account Security]
- "Forgot password?" on the login page now works: users enter their email and receive a password reset link (it previously only showed a fake alert)
- The reset link opens a new "Set a new password" page with the same password rules as sign-up (8+ characters, 1 uppercase letter, 1 number)
- The forgot password form always gives the same answer, so it can't be used to find out which emails have accounts
- Reset links only work for password resets; expired or used links show a clear message with a way to request a new one
- Fixed changing your password in Settings: it now asks for your current password and uses the same rules as sign-up (it previously failed and allowed 6-character passwords)

[Hire Me / Direct Offers]
- The "Hire Me" button on a freelancer's profile now works for clients (in Client mode)
- It opens a form for the offer details: project title, description, the price the client is willing to pay (PHP or USD), an optional deadline, and up to 3 optional files (10 MB each)
- Freelancers get a notification and see the offer under My Proposals → Offers received, where they can open attachments and Accept or Decline
- Accepting an offer turns it into a normal contract with its own chat, so submitting work, releasing escrow, disputes, and ratings work the same as any other contract
- Jobs created from offers are private and never appear on Explore
- Clients see their offers and their status under My Postings → Sent offers, and can withdraw an offer while it's still pending
- Both sides are notified when an offer is accepted, declined, or withdrawn
- Added the direct offers tables and a private file bucket for offer attachments (008_add_direct_offers.sql)

[Client Profiles]
- Profiles now have a Client side as well as a Freelancer side, with a Freelancer | Client switch at the top of the page
- Profile links from job postings and offers open the Client side, links from Browse Users / Top Users open the matching side, and your own profile opens on your current mode
- The Client side shows the person's company name, client bio, jobs posted, hires, client rating, average budget, member since date, and the full list of reviews freelancers left about them
- Owners can edit their company name and client bio from the Client side; editing one side never changes the other side's details
- Each side has its own photo: the camera button changes the photo for the side you're viewing, and the Client side uses the freelancer photo until a client photo is set
- The navbar photo, Browse Users, and Top Users now show the client photo for clients

[Fixes]
- Error pop-ups now look like errors (red icon and outline, shown for 6 seconds) instead of showing a green check like a success; screen readers announce them right away
- Dispute outcomes now match what happened to the money: "Release to freelancer" completes the contract as normal, "Split" completes it but only half the amount counts toward earnings, average price, and revenue, and "Refund client" marks the contract as Refunded so it no longer counts as a completed job or earnings, and the job is closed as cancelled
- Both sides can rate each other after a dispute is resolved, whatever the outcome, and the Dashboard shows "Refunded" or "Completed (split)" on those contracts
- Disputes can only be filed on contracts that are still in progress, and only once at a time (finished or already-disputed contracts are rejected)
- Submitting work, approving work, and leaving a review no longer secretly switch your Client/Freelancer mode; your mode only changes when you use the toggle
- The Message button on Dashboard contracts now opens that contract's chat instead of the general inbox
- After accepting a proposal, the accepted freelancer's card shows a "Message" button that opens your contract chat with them
- Added a Refunded contract status and the amount actually released after a split (009_dispute_outcomes.sql)
- Clicking "View Stages" on a milestone contract now opens the stage breakdown right under that contract (it used to appear at the very bottom of the table, out of sight)
- The proposal form on a job page no longer runs into the footer; only the short budget card follows you while scrolling
- Footer links: Help & Support now opens a new Help page with answers about hiring, working, payments, disputes, and accounts, and Terms / Privacy now take logged-in users back to where they were instead of to the register page
- Explore: the budget slider and From / To boxes now actually filter jobs, the client rating filter now uses the client's real rating, and job cards show the client's rating (★ 4.5) when they have one
- Explore: the category buttons keep readable colours in light and dark mode, and the Filters button works on phones
- Suspended users are now logged out on their next action, when they come back to the tab, or when they change pages, and the login page tells them their account was suspended
- Messages: the "[Name] wants to delete this conversation" notice now actually shows (it was reading the wrong fields), and the chat list marks those conversations with a red "Wants to delete" tag
- Messages and the Dashboard contracts table now show profile photos (clients appear with their client photo)
- The Freelancer side of a profile now has a Reviews tab listing every review from clients, like the Client side has for reviews from freelancers
- The navbar shows a "Freelancer" (green) or "Client" (orange) pill so you always know which mode you're in
- The Freelancer side of a profile now shows the freelancer's average rate (the average amount of their completed contracts, same as Browse Users) instead of a typed-in hourly rate



Roadmap
- Make it so that people who choose the freelancer option also need to put in their bank details and phone number - Complete
- Make it so that people who choose the client option choose whether or not they are a small business or a major contractor and need to put in their business name. - Complete
- Have the toast that appears when changing from client to freelancer slide in and have a mini loading bar to show how much time is left before it disappears - Complete
- Develop a messaging system - Complete
- Have clients be able to delete their posting as long as they have not accepted a freelancer for it yet - Complete
