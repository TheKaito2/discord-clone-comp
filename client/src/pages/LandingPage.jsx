import React from 'react';
import { Download, Menu, ChevronDown } from 'lucide-react';
import '../landing.css';

const navItems = ['Download', 'Nitro', 'Discover', 'Safety', 'Support', 'Blog', 'Careers'];

const sections = [
  {
    title: 'Create an invite-only place where you belong',
    body: 'Discord servers are organized into topic-based channels where you can collaborate, share, and just talk about your day without clogging up a group chat.',
    image: '/assets/section-invite.svg',
    imageAlt: 'Discord channels and chat messages illustration',
    reverse: false,
    shade: false,
  },
  {
    title: 'Where hanging out is easy',
    body: 'Grab a seat in a voice channel when you’re free. Friends in your server can see you’re around and instantly pop in to talk without having to call.',
    image: '/assets/section-hanging-visual.svg',
    imageAlt: 'Discord voice channel and friends illustration',
    reverse: true,
    shade: true,
  },
  {
    title: 'From few to a fandom',
    body: 'Get any community running with moderation tools and custom member access. Give members special powers, set up private channels, and more.',
    image: '/assets/section-fandom.svg',
    imageAlt: 'Discord community roles and members illustration',
    reverse: false,
    shade: false,
  },
];

const footerColumns = [
  ['Product', 'Download', 'Nitro', 'Status'],
  ['Company', 'About', 'Jobs', 'Branding', 'Newsroom'],
  ['Resources', 'College', 'Support', 'Safety', 'Blog', 'Feedback', 'Developers', 'StreamKit'],
  ['Policies', 'Terms', 'Privacy', 'Cookie Settings', 'Guidelines', 'Acknowledgements', 'Licenses', 'Moderation'],
];

function Header() {
  return (
    <header className="site-header" aria-label="Main navigation">
      <a className="logo-link" href="#top" aria-label="Discord home">
        <img src="/assets/discord-logo.svg" alt="" />
      </a>
      <nav className="desktop-nav">
        {navItems.map((item) => (
          <a href={`#${item.toLowerCase()}`} key={item}>
            {item}
          </a>
        ))}
      </nav>
      <a className="open-button open-button--light" href="/login">
        Open Discord
      </a>
      <button className="menu-button" aria-label="Open navigation">
        <Menu size={22} strokeWidth={2.4} />
      </button>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="hero">
      <Header />
      <div className="hero-copy">
        <h1>Imagine a place...</h1>
        <p>
          ...where you can belong to a school club, a gaming group, or a worldwide art community.
          Where just you and a handful of friends can spend time together. A place that makes it
          easy to talk every day and hang out more often.
        </p>
        <div className="hero-actions">
          <a className="download-button" href="#download">
            <Download size={18} strokeWidth={2.2} />
            Download for Windows
          </a>
          <a className="browser-button" href="#browser">
            Open Discord in your browser
          </a>
        </div>
      </div>
      <img className="hero-art" src="/assets/hero-illustration.svg" alt="" aria-hidden="true" />
    </section>
  );
}

function FeatureSection({ title, body, image, imageAlt, reverse, shade }) {
  return (
    <section className={`feature-band${shade ? ' feature-band--shade' : ''}`}>
      <div className={`feature-inner${reverse ? ' feature-inner--reverse' : ''}`}>
        <div className="feature-media">
          <img src={image} alt={imageAlt} />
        </div>
        <div className="feature-copy">
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
      </div>
    </section>
  );
}

function TechSection() {
  return (
    <section className="tech-band">
      <div className="tech-inner">
        <div className="tech-copy">
          <h2>Reliable tech for staying close</h2>
          <p>
            Low-latency voice and video feels like you’re in the same room. Wave hello over video,
            watch friends stream their games, or gather up and have a drawing session with screen
            share.
          </p>
        </div>
        <img className="tech-art" src="/assets/section-tech.svg" alt="Video call and streaming screens illustration" />
        <div className="journey">
          <h2>Ready to start your journey?</h2>
          <a className="download-button download-button--blue" href="#download">
            <Download size={16} strokeWidth={2.3} />
            Download for Windows
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h2>Imagine a place</h2>
          <button className="language-button" type="button">
            <span aria-hidden="true">US</span>
            English, USA
            <ChevronDown size={13} />
          </button>
          <div className="social-row" aria-label="Social links">
            {['t', 'ig', 'f', 'yt'].map((item) => (
              <a href="#social" key={item} aria-label={item}>
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="footer-links">
          {footerColumns.map((column) => (
            <div className="footer-column" key={column[0]}>
              <h3>{column[0]}</h3>
              {column.slice(1).map((item) => (
                <a href={`#${item.toLowerCase().replaceAll(' ', '-')}`} key={item}>
                  {item}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <img src="/assets/discord-logo.svg" alt="Discord" />
          <a className="open-button open-button--blue" href="/login">
            Open Discord
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <main>
      <Hero />
      {sections.map((section) => (
        <FeatureSection key={section.title} {...section} />
      ))}
      <TechSection />
      <Footer />
    </main>
  );
}
