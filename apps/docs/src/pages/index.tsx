import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <Heading as="h1" className="hero__title">
              Edward's Second Brain
            </Heading>
            <p className="hero__subtitle">
              A comprehensive knowledge management system powered by AI and modern web technologies
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--primary button--lg"
                to="/docs/intro">
                Get Started 🚀
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="/docs/architecture/create-a-document">
                View Architecture 📋
              </Link>
            </div>
          </div>
          <div className="col col--6">
            <div className={styles.heroImage}>
              <img
                src="/img/undraw_docusaurus_tree.svg"
                alt="Knowledge Tree"
                className={styles.featureSvg}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatsSection() {
  return (
    <section className={styles.statsSection}>
      <div className="container">
        <div className="row">
          <div className="col col--3">
            <div className="text--center">
              <Heading as="h2">3</Heading>
              <p>Applications</p>
            </div>
          </div>
          <div className="col col--3">
            <div className="text--center">
              <Heading as="h2">v1.1.0</Heading>
              <p>Current Version</p>
            </div>
          </div>
          <div className="col col--3">
            <div className="text--center">
              <Heading as="h2">TypeScript</Heading>
              <p>Fully Typed</p>
            </div>
          </div>
          <div className="col col--3">
            <div className="text--center">
              <Heading as="h2">AI-Powered</Heading>
              <p>Supermemory Integration</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Edward's Second Brain - Knowledge Management System"
      description="A comprehensive knowledge base and documentation system for managing personal insights, research, and project documentation powered by AI.">
      <HomepageHeader />
      <StatsSection />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
