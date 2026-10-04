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
- Implemented Philippine Standard Geographic Code (PSGC) cascaded address selectors (Region, then City/Municipality)
- Added dedicated Freelancer onboarding requiring a mobile number and payout details (GCash, Maya, or a bank account) — completed in Changes 8
- Added dedicated Client onboarding where users choose Individual, Small Business, or Major Contractor, with a required Business Name for businesses — completed in Changes 8
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

[Activity Log]
- Every important action is now recorded: account (sign up, log in, log-in lockouts, password changes and resets, mode switches, profile and photo changes, payout details), jobs, proposals and direct offers (posted, edited, paused, resumed, cancelled, sent, accepted, declined, withdrawn), contracts and money (contract started, work and stages submitted, payments released, disputes filed, ratings left), and admin actions (suspending or reactivating accounts, taking down jobs, resolving disputes)
- Users see their own history in a new Activity tab on their profile (only visible to them), filterable by type
- Admins get an Activity Log section on the admin page with search (name, email, or what happened), type and date filters, and a "View activity" link on each user to see just that person's actions
- Added the activity log table (010_activity_log_and_onboarding.sql)

[Onboarding Details]
- Freelancer sign-up now asks for a mobile number and payout details (GCash, Maya, or a bank account) instead of an hourly rate
- Client sign-up now asks whether you're hiring as an Individual, Small Business, or Major Contractor; businesses must enter a business name
- Payout details are kept in a private table that only the server can read, and are only ever shown masked (•••• 1234), to the freelancer and to admins in User Management
- Freelancers need payout details before they can send proposals or accept direct offers, so there's always somewhere to pay them
- Existing accounts see a reminder on their profile until they add their payout details (Freelancer side) or business type (Client side); clients can change their business type when editing their Client profile, and it shows as a badge there
- Added the payout details table and client business type (010_activity_log_and_onboarding.sql)
- Freelancer and client payment details are now separate: each side of your own profile has a Payments tab (only you can see it), with payout details on the Freelancer side (where you get paid) and a payment method on the Client side (how you fund escrow); Security now only holds the password form
- Clients add a payment method (GCash, Maya, bank account, or debit/credit card) at sign-up or from the Client side's Payments tab, and need one before they can accept a proposal or send a direct offer; existing clients see a reminder until they add one
- For cards only the brand, last 4 digits, and expiry are saved, never the full card number; card numbers are checked for typos before saving
- Admins see both, masked, in User Management (payout details and the client payment method)
- Added the client payment methods table (011_client_payment_methods.sql)

[Explore Badges, Proposal Attachments & Dark Mode]
- Explore job cards now show your own relationship to each job: "Applied" (your proposal is pending), "Hired" (your proposal was accepted), or "Your posting" (you posted it), and the button reads "View job" / "View your posting" instead of "View & Apply"; badges update live
- Freelancers can attach up to 3 files (10 MB each: images, PDF, Office files, text, zip) to a proposal, such as work samples or a CV
- Attachments are private: only the freelancer and the job's client can open them, through short-lived links, from the proposal card in My Postings and in My Proposals
- If a file fails to upload, the proposal isn't sent, so nothing is left half-finished
- Added the proposal files table and a private file bucket (014_proposal_attachments.sql)
- Dark mode: Bootstrap's own colours now switch to dark too, which fixes text that stayed near-black on the dark background, such as the job titles in the admin Dispute Resolution list, input add-ons, and the soft-coloured badges
- Dark mode: the Terms and Privacy documents and the attached-file preview in Messages are now readable

[Real-Time Updates]
- The site now updates live without refreshing, using Server-Sent Events: each logged-in tab keeps one connection to the backend (/api/v1/events), which sends a small signal whenever something changes, and the page reloads just its own data through the normal API (so all permission checks stay the same)
- Notifications arrive instantly: the bell updates and a pop-up appears (e.g. "Juan accepted your proposal"), and clicking the pop-up opens the related page
- Dashboard (contracts, escrow, stages, proposals), My Proposals, My Postings, a job's incoming proposals, and direct offers refresh by themselves when something changes
- Explore and job pages update live: jobs on screen change in place when they're taken, paused, edited, or removed, and brand-new jobs wait behind a "N new jobs — show" button so the list doesn't jump
- The Messages chat list updates live with new chats, new messages in other chats, and delete requests (open chats were already live)
- The admin page (users, disputes, jobs, and the Activity Log) updates live
- Suspending an account now logs that person out immediately
- If the connection drops, it reconnects by itself; the bell also re-checks every minute as a backup

[Profile Messaging]
- The Message button on profiles now works: in Client mode it messages a freelancer from their Freelancer side, and in Freelancer mode it messages a client from their Client side (switch modes first if needed)
- The first message is written in a small pop-up; sending it creates the chat and opens it in Messages, so accidental clicks never leave empty chats
- Each client and freelancer pair has one profile chat; clicking Message again reopens it. Contract chats are still separate, one per contract
- Profile chats show as "Direct message" and can be deleted at any time (both people confirm, like contract chats), instead of only after a job is completed
- The other person gets a notification with a preview of the message
- Chats no longer need a contract (013_profile_chats.sql)

[Account Deletion]
- Users can delete their own account from Profile → Security → Danger Zone; admin and staff accounts can't
- A warning window lists exactly what will be deleted, what happens to open items, and what stays, and the user must enter their password and type DELETE before the button works
- Deletion is blocked while any contract is active, waiting for approval, or in a dispute, and the window lists those contracts
- Deleting wipes the person's name, email, photos, bios, skills, phone, links, payout details, payment method, and notifications, and blocks the login for good
- Contracts, chats, and ratings shared with other people are kept and show "Deleted user", so the people they worked with keep their records and earnings
- Their open job postings are cancelled, pending proposals withdrawn, and pending direct offers closed, and the people affected are notified
- Deleted accounts no longer appear in Browse Users or Top Users, can't be sent offers, and their profile page says the account was deleted; admins see them as "deleted" in User Management
- Added the deleted account status (012_account_deletion.sql)

[Login Protection]
- After 5 wrong passwords for the same email, logging in to that account is locked for 15 minutes (the message says how long to wait); the last 2 attempts show a warning
- One device can't make more than 20 wrong attempts across any emails in 15 minutes
- The "current password" check when changing your password counts toward the same limit
- Forgot password sends at most 3 reset emails per address per hour
- Replaced the login page's old 3-try / 30-second lock, which only ran in the browser and reset on refresh, with the server's limit and messages

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


Changes 9

[Dark Mode & UI Polish]
- Synchronized dark mode persistence across the login and register pages so toggling dark mode on one stays active when switching between them
- Fixed the Security tab under Profile settings in dark mode: password form inputs, labels, and helper descriptions now use proper dark mode colors and borders instead of unstyled white backgrounds
- Unified dynamic legal routes (/privacy, /terms, /faq, /guidelines) with responsive tab switching, back buttons, and full dark mode support
- Fixed the mobile filter drawer on Explore: increased z-index above the header, improved overlay backdrop, and added smooth slide animations
- Enhanced Help & Support page (/help, /contact) with direct navigation and dark mode compatibility

[Job Proposals & Attachments]
- Freelancers can now add a portfolio link and upload a sample file attachment (PDF, DOCX, TXT, PNG, JPEG up to 5 MB) when submitting a job proposal
- Clients can view the submitted portfolio link and download the attached sample file directly from the proposal card alongside the milestone breakdown
- Added a private proposal-attachments Supabase storage bucket and database columns for portfolio and file attachments (010_add_proposal_attachments.sql)
- Replaced the empty proposal form and red validation errors on already-applied jobs with a clean "Your Proposal" summary card showing the submitted bid, milestones, cover letter, work samples, and a "Withdraw & Edit Proposal" action button
- Cleaned up Dashboard "My Proposals": the "Active" tab now strictly shows pending bids awaiting client review, eliminating duplicate contract listings, and upgraded Quick Actions with contextual shortcuts (Find Open Projects, Contract Messages, Recent Activity Log, and Proposal Tracker)

[Messaging & Grace Period]
- Added a 1-week messaging grace period after a contract ends (completed, refunded, or cancelled) with an alert banner showing the remaining time
- Contract chats automatically lock to read-only once the 1-week grace period expires, preserving full message history while preventing further sends
- Shared links in chat messages are now automatically detected and turned into clickable, secure external links

[Browse Users & Ratings]
- Added a star rating filter dropdown (4.5+, 4.0+, 3.5+, 3.0+, Any Rating) on Browse Users to filter freelancers and clients by minimum review rating
- Integrated the minimum rating filter with the backend user search and ranking queries

[Activity Logging & Audit Trail]
- Added an activity logging system that records user actions (proposals, contracts, disputes, job postings, reviews) into the database with automatic fallback
- Added an Activity Log tab in Profile settings showing chronological account actions with type and date filters
- Added an activity_logs audit table with indexing and row-level security (011_add_activity_logs.sql)

[Security & Rate Limiting]
- Added sliding-window rate limiting on login and forgot-password endpoints (5 requests per 15 minutes) with retry-after response headers
- Added double-submit protection on login and register forms to prevent duplicate requests from repeated clicks
- Added an 18+ age verification requirement during account registration
- Added a "Both (Freelancer & Client)" role choice during sign-up to register users for both modes
- Added an "Others" option with a custom explanation text field when filing a dispute ticket

Changes 10

[Explore & Milestone Search]
- Searching "milestone", "milestones", or "milestone developer" on the Explore page now accurately matches jobs with milestone-based budgets alongside title, description, skills, and tags
- Added a dedicated Project Type filter (All Project Types, Milestone-Based, Fixed Price) in the Explore sidebar and active filter tag chips
- Added clean text-only "Milestone" and "Fixed Price" badges on Explore job cards and the Job Details page
- Added resilient JSON response parsing and an in-place retry handler on job loading to prevent "unexpected end of data" network failures

[Dashboard Refinements & Modernization]
- Fixed a blank-screen crash on the dashboard caused by an undefined currentUserId reference
- Standardized contract action buttons (View Deliverables, Message, Dispute, Rate) to single-line pill buttons with uniform heights and no awkward text wrapping
- Rebalanced contract table column widths (Job / Contract, Counterparty, Escrow Amount, Status, Actions) to ensure all action buttons fit comfortably on one line
- Capitalized contract status labels (e.g. "Completed") and removed unclickable released badges from the Actions column
- Removed the green background boxes from "In progress or submitted" and "Secured via Supabase" on top stat cards for a clean, cohesive dark-mode appearance
- Modernized Incoming Proposals, My Proposals, and Action Item cards with sleek dark-mode cards and subtle borders, replacing legacy green blocks
- Removed the "+ Post a New Job" button from the Action Items empty state for a cleaner "All caught up!" presentation
- Deduplicated repetitive "USER LOGIN" entries in the Recent Activity feed so only the latest login session is shown, prioritizing substantive business actions (jobs posted, bids submitted, milestones, deliverables, and escrow releases)

[Profile & Navigation]
- Made the /profile route self-healing: visiting /profile or /profile?tab=activity without a user ID parameter now automatically loads the logged-in user's profile instead of showing "User not found"
- Restored the "My Account" navigation link and user icon in the sidebar
- Connected the Recent Activity widget footer link to open the user's full activity history tab directly (/profile/:id?tab=activity)

[Legal Modal & Dark Mode Contrast Fixes]
- Fixed nearly invisible black-on-dark-green text in the Terms of Service and Privacy Notice modal by removing hardcoded inline dark colors and applying semantic dark-mode text styling
- Modernized modal backgrounds from murky moss-green (#1A2420) to sleek dark slate (#141824) with crisp borders (#262B36), high-contrast headings, readable TOC links, and white close buttons
- Fixed tab switching and prop handling in LegalModal so clicking either "Terms of Service" or "Privacy Notice" opens the selected document directly with pill-shaped active tabs

[Branch Integration & Safety]
- Cleanly integrated upstream account deletion, payout methods, and activity log updates into the development branch without regressions
- Created a safety rollback branch (backup-before-merge-ebf1d02) to preserve local state prior to merging

[Registration Fixes]
- Fixed sign-up on the new register page, which the server was refusing for every new account because required details were missing
- Freelancer sign-up: replaced the hourly rate field with a required mobile number, and added payout details (GCash, Maya, or bank account with bank name, account holder, and number)
- Client sign-up: added "Hiring as" (Individual, Small Business, or Major Contractor), a business name (required for businesses), and a payment method (GCash, Maya, bank account, or debit/credit card with expiry)
- Choosing "Both" signs up as a freelancer, since every account can switch to Client mode anytime
- Professional title, location (city and region), and business name are now actually saved with the new account
- The Create Account button stays disabled until the details are filled in correctly, with hints for wrong mobile and account numbers

[Proposal & Chat Fixes]
- Fixed "Withdraw & Edit" on the job page: re-sending a withdrawn proposal always failed with "You have already submitted a proposal for this job"
- Re-sending now replaces the withdrawn proposal completely (bid, cover letter, milestones, portfolio link, and files; old files are removed), and the client sees it as a new proposal
- If anything fails while re-sending, the proposal goes back to how it was (still withdrawn), so the freelancer can simply try again
- Admins reading a contract chat now see who sent each message: client messages on the left and freelancer messages on the right, each with the right photo and a "Name · Client" or "Name · Freelancer" label (admins still can't send messages)
- The admin's chat list names both people ("Client & Freelancer") instead of only the client

[Login & Account Fixes]
- The login rate limit now only counts failed attempts, so switching between accounts on one computer no longer locks everyone out for 5 minutes; repeated wrong passwords still do
- Removed the login page's browser-only 3-try / 30-second lock again, so the server's messages show (attempts left before a lock, and how long to wait)
- "Forgot password?" on the login page opens the reset page again (it only showed a test pop-up)
- Fixed the Forgot password and Set a new password pages showing an unstyled text box and button in light mode (their styles were lost when the login page was redesigned)
- The login page tells suspended users they were suspended by an admin, and deleted accounts that they were deleted, instead of showing nothing
- One password rule everywhere: sign-up, changing your password, and resetting it all need 8+ characters with an uppercase letter, a lowercase letter, a number, and a special character (existing passwords keep working)

[Proposal & Payment Display Fixes]
- The "Your Proposal" card on a job page now shows your milestone stages, portfolio link, and attached files (it was reading the wrong fields and showed none of them)
- Withdraw & Edit now fills the form back in with your stages and portfolio link
- Payment messages in chats, notifications, and the activity log use the job's currency ($ for USD jobs and offers instead of always ₱)
- Totals that mix PHP and USD contracts (Dashboard escrow total, admin platform revenue, and average rates on profiles, Browse Users, and Top Users) now convert USD to PHP with the live exchange rate instead of adding dollars as pesos
- My Proposals now shows USD bids in dollars (it was missing the job's currency)
- Restoring a withdrawn milestone proposal from My Proposals only lets you edit the cover letter; the total comes from the stages, so changing amounts is done with Withdraw & Edit on the job page (it could leave a total that didn't match the stages)
- Register page: fixed the field error messages, password show/hide buttons, Terms and Privacy links, and the loading spinner, which had no styles
- Job pages no longer send the client's email address to the browser

[Activity Log Cleanup]
- Removed the second activity log that recorded logins, job posts, proposals, profile and password changes twice (activity_logs table and a backup file on the server)
- The Dashboard's Recent Activity widget now reads the same activity log as Profile → Activity, shows the latest login only once, and updates live

Changes 10.1

[Milestone System Enhancements & Validation (Phases 1–3)]
- Implemented a strict 10-stage maximum cap on milestone proposals to prevent UI overflow and protect against payload bloat
- Enforced a minimum budget floor of ₱100.00 / $2.00 per milestone stage, alongside 3–100 character title length validation, to eliminate micro-transaction spam
- Added real-time frontend milestone validation and a live counter ("x/10 stages") on the Job Details proposal form, automatically disabling the "+ Add Stage" button once 10 stages are reached
- Implemented a formal "Request Revision" review workflow (PATCH /api/v1/contracts/:id/milestones/:milestoneId/request-revision), enabling clients to request changes with required feedback notes instead of being forced to approve or dispute deliverables
- Replaced the single-option deliverable approval with a dual-action review modal: clients can either approve & release escrow or submit revision requests directly back to the freelancer
- Added automatic notification (milestone_revision_requested), system chat messaging, and activity audit logging when milestone revisions are requested
- Built the new MilestoneStepper component featuring an interactive visual progress bar, released vs. total budget metrics, and color-coded stage cards (Completed, In Review, Needs Revision, In Progress, Pending)
- Integrated the visual stepper and live revision alert banners directly into the expanded contract view on the Dashboard for seamless progress tracking

[Anti-Slop & Linguistic Keyboard-Smash Protection]
- Upgraded slopFilter.js with a comprehensive keyboard-smash detection algorithm that analyzes character diversity ratios, consonant clustering, and repetitive key cycling
- Blocked home-row mashing (e.g. "ahdhsadhasdh", "asdsaddsadsadasasd") across Job Titles, Descriptions, Custom Categories, and Proposal Cover Letters
- Enforced a 5-word minimum requirement on job descriptions and proposals to eliminate single giant unbroken word bypasses (e.g. 50-character strings)
- Added smart exemptions for code snippets, technical acronyms (AWS, PHP, CSS), and external repository/portfolio URLs

[Real-Time Proposal Draft Auto-Save]
- Implemented automated local draft caching on Job Details: proposals auto-save continuously as the user types cover letters, bid amounts, portfolio links, or custom milestone breakdowns
- Protected freelancers from losing proposal work when navigating away to configure payment/payout methods, with an instant one-click recovery banner and clean discard option
- Automatically clears stored drafts upon successful proposal submission

[Category Architecture & Pollution Cleanup]
- Fixed category pollution vulnerability where user-typed custom categories under "Others" were being inserted into the global categories table
- Routed custom job specialties cleanly to the official "Others" category ID without mutating the global catalog, embedding custom specialties directly into the job posting
- Purged polluted test categories (e.g. "Chibi Artist", "Cloud Solutions Architect", test gibberish) from Supabase and re-linked legacy jobs back to the official Others category

Roadmap
- Make it so that people who choose the freelancer option also need to put in their bank details and phone number - Complete
- Make it so that people who choose the client option choose whether or not they are a small business or a major contractor and need to put in their business name. - Complete
- Have the toast that appears when changing from client to freelancer slide in and have a mini loading bar to show how much time is left before it disappears - Complete
- Develop a messaging system - Complete
- Have clients be able to delete their posting as long as they have not accepted a freelancer for it yet - Complete

