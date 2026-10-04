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
    { step: 1, title: 'Post a job or browse talent', desc: 'Describe your project requirements or search our curated pool of vetted professionals. Get matched in minutes.' },
    { step: 2, title: 'Compare proposals and chat', desc: 'Review detailed proposals, check portfolios and ratings, and interview your top picks via built-in messaging.' },
    { step: 3, title: 'Pay securely and approve work', desc: 'Funds are held in escrow until you approve deliverables. Release payment only when you\'re satisfied with the results.' },
  ],
  freelancers: [
    { step: 1, title: 'Create your profile', desc: 'Showcase your skills, portfolio, and experience. Set your rates and availability to attract the right clients.' },
    { step: 2, title: 'Find jobs and send proposals', desc: 'Browse curated job listings matching your expertise. Send compelling proposals and stand out from the crowd.' },
    { step: 3, title: 'Deliver work and get paid', desc: 'Complete milestones, submit deliverables, and receive prompt payment directly to your preferred method.' },
  ],
};

export const WHY_US = [
  { title: 'Vetted Talent', desc: 'Every freelancer goes through a rigorous verification process. Only the top 3% make it to our platform.', icon: 'shield-check' },
  { title: 'Escrow-Protected Payments', desc: 'Your funds are held securely in escrow and only released when you approve the delivered work.', icon: 'lock' },
  { title: 'Transparent Pricing', desc: 'No hidden fees or surprise charges. Know exactly what you\'ll pay before you start any project.', icon: 'eye' },
  { title: '24/7 Support', desc: 'Our dedicated support team is available around the clock to help resolve any issues quickly.', icon: 'headphones' },
  { title: 'Milestone-Based Contracts', desc: 'Break projects into clear milestones with defined deliverables, timelines, and payment schedules.', icon: 'flag' },
  { title: 'Built-in Collaboration', desc: 'Integrated messaging, file sharing, and video calls keep all project communication in one place.', icon: 'message-circle' },
];

export const STATS_DATA = [
  { label: 'Freelancers', value: 50000, suffix: '+', prefix: '' },
  { label: 'Projects Completed', value: 120000, suffix: '+', prefix: '' },
  { label: 'Paid to Freelancers', value: 85, suffix: 'M+', prefix: '$' },
  { label: 'Satisfaction Rate', value: 4.9, suffix: '/5', prefix: '', decimals: 1 },
];

export const PRICING_DATA = [
  { name: 'For Clients', price: 'Free', period: '', desc: 'Free to post, 3% marketplace fee on payments.', features: ['Unlimited job posts', 'Browse all freelancers', 'Escrow protection', 'Messaging & file sharing', '24/7 support'], cta: 'Post a Job', highlight: false },
  { name: 'Freelancer Basic', price: 'Free', period: '', desc: '10% service fee on earnings.', features: ['Create your profile', 'Send up to 30 proposals/mo', 'Escrow protection', 'Direct messaging', 'Basic analytics'], cta: 'Join Free', highlight: false },
  { name: 'Freelancer Pro', priceMonthly: 19, priceYearly: 15, period: '/mo', desc: '5% service fee, featured profile, priority support.', features: ['Unlimited proposals', 'Featured in search results', '5% service fee (vs 10%)', 'Priority support', 'Advanced analytics', 'Custom portfolio URL', 'Early access to jobs'], cta: 'Go Pro', highlight: true },
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
  { q: 'How does payment protection work?', a: 'When a client funds a milestone, the payment is held securely in our escrow system. Funds are only released to the freelancer once the client reviews and approves the delivered work. If there\'s a dispute, our resolution team steps in to mediate fairly.' },
  { q: 'How are freelancers vetted?', a: 'Every freelancer undergoes identity verification, skill assessment, and portfolio review. We also monitor ongoing performance through client ratings, completion rates, and response times to maintain quality standards.' },
  { q: 'What are the fees?', a: 'Clients pay a 3% marketplace fee on each payment. Freelancers on the Basic plan pay 10% of their earnings, while Pro members pay just 5%. There are no hidden costs or upfront charges.' },
  { q: 'How do I get paid as a freelancer?', a: 'Once a client approves your milestone delivery, funds are released to your account within 24 hours. You can withdraw via bank transfer, PayPal, or Wise. Minimum withdrawal is $25.' },
  { q: 'Can I hire for long-term work?', a: 'Absolutely. Many clients use RaketBase for ongoing engagements. You can set up recurring weekly or monthly contracts with automatic milestone creation and payment scheduling.' },
  { q: 'What if I\'m not satisfied with the work?', a: 'You can request unlimited revisions within the project scope. If the issue can\'t be resolved between you and the freelancer, our dispute resolution team will review the case and ensure a fair outcome.' },
  { q: 'How long does it take to hire someone?', a: 'Most clients receive their first proposals within 2-4 hours of posting a job. On average, clients hire within 48 hours. For urgent projects, you can use our "Priority" tag to attract immediate attention.' },
  { q: 'Is my data secure?', a: 'We use bank-level 256-bit SSL encryption for all data transmission. Payment information is processed through PCI-DSS compliant providers. We never share your personal data with third parties without consent.' },
];

export const TRUSTED_BY = ['Acme Corp', 'TechFlow', 'StartupX', 'CloudBase', 'InnovateCo', 'DataPrime'];



