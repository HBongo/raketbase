export const BRAND = {
  name: 'RaketBase',
  tagline: 'The Homebase for Your Next Big Raket.',
  heroTitle: 'Launch your raket. Build your base.',
  heroSub: 'Welcome to RaketBase—the modern freelance services marketplace built to connect skilled talent with clients ready to bring their projects to life. Whether you are an entrepreneur searching for reliable creative, technical, or business solutions, or a freelancer looking to showcase your skills and turn your passion into rewarding opportunities, RaketBase makes finding the right match seamless, secure, and accessible. Discover verified local services, collaborate with total confidence, and power your next big idea forward—all within one unified platform.',
  stats: { rating: '4.9/5', projects: '120K+', countries: '150+', freelancers: '50K+', paidOut: '$85M+' },
};

export const CATEGORIES = [
  { id: 'web-dev', name: 'Web Development', icon: 'code', count: '12,400+' },
  { id: 'ui-ux', name: 'UI/UX Design', icon: 'palette', count: '8,200+' },
  { id: 'graphic', name: 'Graphic Design', icon: 'brush', count: '10,100+' },
  { id: 'writing', name: 'Writing & Translation', icon: 'edit', count: '9,300+' },
  { id: 'marketing', name: 'Digital Marketing', icon: 'trending-up', count: '6,800+' },
  { id: 'video', name: 'Video & Animation', icon: 'film', count: '5,500+' },
  { id: 'mobile', name: 'Mobile Apps', icon: 'smartphone', count: '7,100+' },
  { id: 'data', name: 'Data & AI', icon: 'cpu', count: '4,200+' },
];

export const POPULAR_SEARCHES = ['Web Design', 'Logo Design', 'Video Editing', 'Copywriting', 'SEO', 'Mobile Apps'];

export const FREELANCERS = [
  { id: 1, name: 'Sarah Chen', initials: 'SC', title: 'Full-Stack Developer', country: 'Singapore', rating: 4.9, reviews: 147, skills: ['React', 'Node.js', 'TypeScript'], rate: 85, badge: 'Top Rated', category: 'web-dev' },
  { id: 2, name: 'Marcus Rivera', initials: 'MR', title: 'UI/UX Designer', country: 'Philippines', rating: 5.0, reviews: 203, skills: ['Figma', 'Prototyping', 'Design Systems'], rate: 75, badge: 'Top Rated', category: 'ui-ux' },
  { id: 3, name: 'Aisha Patel', initials: 'AP', title: 'Brand Identity Designer', country: 'India', rating: 4.8, reviews: 89, skills: ['Illustrator', 'Branding', 'Logo Design'], rate: 60, badge: 'Verified', category: 'graphic' },
  { id: 4, name: 'James O\'Connor', initials: 'JO', title: 'Content Strategist', country: 'Ireland', rating: 4.9, reviews: 112, skills: ['Copywriting', 'SEO', 'Blog Writing'], rate: 70, badge: 'Top Rated', category: 'writing' },
  { id: 5, name: 'Yuki Tanaka', initials: 'YT', title: 'Motion Graphics Artist', country: 'Japan', rating: 4.7, reviews: 68, skills: ['After Effects', '3D Animation', 'Video Editing'], rate: 90, badge: 'Verified', category: 'video' },
  { id: 6, name: 'Elena Volkov', initials: 'EV', title: 'Data Scientist', country: 'Germany', rating: 4.9, reviews: 94, skills: ['Python', 'Machine Learning', 'TensorFlow'], rate: 110, badge: 'Top Rated', category: 'data' },
  { id: 7, name: 'Carlos Mendez', initials: 'CM', title: 'Mobile App Developer', country: 'Mexico', rating: 4.8, reviews: 156, skills: ['Flutter', 'React Native', 'Swift'], rate: 80, badge: 'Verified', category: 'mobile' },
  { id: 8, name: 'Lisa Nguyen', initials: 'LN', title: 'Digital Marketing Specialist', country: 'Vietnam', rating: 4.9, reviews: 134, skills: ['Google Ads', 'Facebook Ads', 'Analytics'], rate: 65, badge: 'Top Rated', category: 'marketing' },
];

export const HOW_IT_WORKS = {
  clients: [
    { step: 1, title: 'Post & Match', desc: 'Share your project details and instantly reach our vetted talent pool.' },
    { step: 2, title: 'Review & Interview', desc: 'Compare detailed proposals, review past work, and chat directly to find the right fit.' },
    { step: 3, title: 'Hire with Confidence', desc: 'Award the project and get to work securely. Funds are safely held in escrow.' },
  ],
  freelancers: [
    { step: 1, title: 'Sign Up & Stand Out', desc: 'Create your free profile and verify your skills to get noticed.' },
    { step: 2, title: 'Pitch & Win', desc: 'Send tailored proposals to exciting projects and negotiate directly with clients.' },
    { step: 3, title: 'Deliver & Get Paid', desc: 'Complete milestones, submit deliverables, and receive fast, secure payments with zero premium paywalls.' },
  ],
};

export const WHY_US = [
  { title: 'Community-Rated Talent', desc: 'Discover skilled freelancers based on honest, community-driven ratings. Client reviews help you find the best match for your projects.', icon: 'shield-check' },
  { title: 'Direct & Flexible Agreements', desc: 'Clients and freelancers negotiate directly. Set your own terms, agree on pricing, and collaborate without restrictive marketplace barriers.', icon: 'lock' },
  { title: 'Transparent & Fair Pricing', desc: 'No hidden premium tiers or paywalls. Clients and freelancers select price ranges that match their skills and budget upfront.', icon: 'eye' },
  { title: 'Dedicated Student Support', desc: 'Built by passionate Computer Science students from Mapúa University, we actively monitor and support our platform to ensure a smooth experience.', icon: 'headphones' },
  { title: 'Flexible Project Scopes', desc: 'Post projects with specific requirements and target budgets. Freelancers can easily browse, review the scope, and send proposals right away.', icon: 'flag' },
  { title: 'Built-in Messaging', desc: 'Connect seamlessly with built-in messaging. Discuss project details, negotiate pricing, and maintain communication even after the project is done.', icon: 'message-circle' },
];

export const STATS_DATA = [
  { label: 'Freelancers', value: 50000, suffix: '+', prefix: '' },
  { label: 'Projects Completed', value: 120000, suffix: '+', prefix: '' },
  { label: 'Paid to Freelancers', value: 85, suffix: 'M+', prefix: '$' },
  { label: 'Satisfaction Rate', value: 4.9, suffix: '/5', prefix: '', decimals: 1 },
];

export const PRICING_DATA = [
  { name: 'For Clients', price: 'Free', period: '', desc: 'Free to post, 3% marketplace fee on payments.', features: ['Unlimited job posts', 'Browse all freelancers', 'Escrow protection', 'Messaging & file sharing', '24/7 support'], cta: 'Post a Job', highlight: false },
  { name: 'For Freelancers', price: 'Free', period: '', desc: '10% service fee on earnings.', features: ['Create your profile', 'Unlimited proposals', 'Escrow protection', 'Direct messaging', 'Zero premium paywalls'], cta: 'Join Free', highlight: true },
];

export const TESTIMONIALS = [
  { quote: 'RaketBase completely transformed how we hire developers. We found an incredible React engineer within 48 hours, and the escrow system gave us total peace of mind.', name: 'David Park', role: 'CTO', company: 'Nimbus Labs', rating: 5, type: 'customer' },
  { quote: 'I\'ve been freelancing for 6 years across multiple platforms. RaketBase has the best client quality and fastest payment processing I\'ve ever experienced.', name: 'Maria Santos', role: 'Brand Designer', company: 'Philippines', rating: 5, type: 'freelancer' },
  { quote: 'The milestone system keeps both sides accountable. We\'ve completed 15 projects on RaketBase with zero disputes. It just works.', name: 'Alex Thompson', role: 'Product Manager', company: 'ScaleUp Inc.', rating: 5, type: 'customer' },
  { quote: 'Switching to Pro was a game-changer. The reduced fees and featured profile doubled my monthly income within the first quarter.', name: 'Kenji Watanabe', role: 'Full-Stack Developer', company: 'Japan', rating: 5, type: 'freelancer' },
  { quote: 'Finding specialized AI researchers used to take us months. On RaketBase, we got 10 qualified proposals in two days. Outstanding talent pool.', name: 'Sarah Jenkins', role: 'Head of Engineering', company: 'DataFlow', rating: 5, type: 'customer' },
  { quote: 'The built-in contract and messaging tools save me hours of admin work every week. I can just focus on designing, and RaketBase handles the rest.', name: 'Oliver Smith', role: 'UI/UX Freelancer', company: 'UK', rating: 4.9, type: 'freelancer' },
  { quote: 'I was hesitant at first, but the escrow protection makes working with new clients completely risk-free. Highly recommend for any serious freelancer.', name: 'Elena Rostova', role: 'Data Scientist', company: 'Germany', rating: 5, type: 'freelancer' },
  { quote: 'We scaled our content team from 2 to 15 writers entirely through RaketBase. The talent quality is consistent and top-tier.', name: 'Marcus Chen', role: 'Content Director', company: 'GrowthMedia', rating: 5, type: 'customer' },
  { quote: 'After trying every major freelance site, RaketBase is the only one I use now. Their 24/7 support team actually cares about resolving issues quickly.', name: 'Aisha Patel', role: 'Digital Marketer', company: 'India', rating: 4.8, type: 'freelancer' },
];

export const FAQS = [
  { q: 'How does payment protection work?', a: 'Clients and freelancers can post and accept jobs based on a flexible price range. Once connected, both parties can discuss project stages and mutually agree on specific pricing through our built-in messaging system to ensure complete transparency before any work begins.' },
  { q: 'How are freelancers vetted?', a: 'Freelancers build their reputation through client feedback. After a project is completed, clients can rate the freelancers they\'ve worked with. Our system uses these ratings to help you easily filter and find top-tier talent based on their performance stars.' },
  { q: 'What are the fees?', a: 'Clients and freelancers have the freedom to choose price ranges that best match their specific skills, time, and budget requirements. You can negotiate and agree upon the final project cost directly with your counterpart.' },
  { q: 'How do I get paid as a freelancer?', a: 'Once you create a freelancer account, you can fully customize your profile to showcase your unique skills and specialties. This allows you to connect with clients from everywhere, complete their project requests, and receive compensation based on the terms you both agreed upon.' },
  { q: 'Can I hire for long-term work?', a: 'Yes, absolutely! Time and work arrangements on RaketBase are highly flexible. Clients and freelancers are free to discuss and establish long-term contracts or ongoing collaborations based on mutual agreement.' },
  { q: 'What if I\'m not satisfied with the work?', a: 'RaketBase features an honest rating system where you can review the freelancer you worked with. You can also continue communicating with them via our messaging system even after the project is completed to resolve any issues. For further concerns, you can email us at rjsdelagua@mymail.mapua.edu.ph — we want to ensure RaketBase remains a solid launchbase for your projects!' },
  { q: 'How long does it take to hire someone?', a: 'Once you post a job, it becomes immediately visible to our entire pool of freelancers. Professionals with different skill sets can review your project\'s scope and target price right away, allowing you to start receiving proposals and hire the right talent quickly.' },
  { q: 'Is my data secure?', a: 'Absolutely. We deeply value our users\' data privacy and security. All of your records, messages, and personal information are securely encrypted and protected using Supabase\'s robust backend infrastructure.' },
];

export const TRUSTED_BY = ['Acme Corp', 'TechFlow', 'StartupX', 'CloudBase', 'InnovateCo', 'DataPrime'];



