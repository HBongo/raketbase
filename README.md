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


Roadmap
- Make it so that people who choose the freelancer option also need to put in their bank details and phone number - Complete
- Make it so that people who choose the client option choose whether or not they are a small business or a major contractor and need to put in their business name. - Complete
- Have the toast that appears when changing from client to freelancer slide in and have a mini loading bar to show how much time is left before it disappears - Complete
- Develop a messaging system - Complete
- Have clients be able to delete their posting as long as they have not accepted a freelancer for it yet - Complete