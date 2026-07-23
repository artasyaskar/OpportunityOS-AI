<div align="center">

# OpportunityOS AI

### AI Operating System for Discovering, Matching, and Winning Global Opportunities

A full-stack AI platform that helps students and professionals discover scholarships, fellowships, grants, remote jobs, hackathons, accelerators, and research opportunities while generating personalized, evidence-backed application documents.

---

[Live Demo](https://www.oppertunityos.dev/) •
[GitHub Repository](https://github.com/artasyaskar/OpportunityOS-AI)

</div>

---

# Overview

Finding high-quality opportunities is difficult.

Preparing competitive applications is even harder.

OpportunityOS AI combines intelligent opportunity discovery, AI-powered profile analysis, and automated application assistance into one unified platform.

Instead of searching hundreds of websites manually, users build a verified professional profile once. The platform continuously recommends opportunities that match their background and assists in preparing tailored applications using structured evidence from resumes, transcripts, research papers, projects, certifications, and achievements.

The goal is simple:

> Help talented people spend less time searching and more time winning opportunities.

---

# Key Features

## Intelligent Opportunity Discovery

- Scholarships
- Fellowships
- Grants
- Research Programs
- Internships
- Remote Jobs
- Competitions
- Hackathons
- Accelerators
- Conferences

All opportunities are verified, categorized, searchable, and ranked according to the user's profile.

---

## AI Matching Engine

Rather than using keyword matching alone, OpportunityOS AI evaluates multiple profile signals including:

- Academic background
- Skills
- Experience
- Certifications
- Research
- Leadership
- Portfolio
- Career interests

Each recommendation includes an explainable compatibility score with transparent reasoning instead of opaque AI predictions.

---

## Knowledge Vault

Users securely store:

- Resume
- CV
- Transcript
- Certificates
- Portfolio
- Research Papers
- SOPs
- Personal Statements
- Recommendation Letters

Documents are transformed into structured knowledge instead of repeatedly sending raw PDFs to language models.

---

## AI Application Builder

Generate personalized:

- Statement of Purpose
- Personal Statement
- Motivation Letter
- Cover Letter
- Scholarship Essays
- Grant Applications

using only verified evidence from the user's Knowledge Vault.

---

## Research Memory

Research papers can be uploaded using:

- PDF
- DOI
- arXiv
- URL

The Research Agent extracts:

- Research Area
- Problem Statement
- Methodology
- Algorithms
- Results
- Novelty
- Contributions
- Keywords

These structured insights become reusable context across future applications.

---

## Explainable Recommendations

Every recommendation answers:

- Why was this opportunity recommended?
- Which skills matched?
- Which requirements are missing?
- What should improve before applying?

---

## AI Architecture

The platform uses a resilient multi-provider AI routing system.

Primary Provider

- Google Gemini

Automatic Fallback

- Groq

Vision Provider

- OpenRouter Vision Models

If one provider fails, requests are automatically routed without interrupting the user experience.

---

# Technology Stack

Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS

Backend

- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Admin SDK

Artificial Intelligence

- Google Gemini
- Groq
- OpenRouter Vision Models

Infrastructure

- Vercel
- Firebase
- Edge Rendering
- Static Site Generation

---

# System Highlights

- Explainable AI recommendations
- Evidence-based application generation
- Knowledge-first architecture
- Provider failover
- Static-first performance
- Responsive dashboard
- Authentication with Firebase
- Admin verification workflow
- Production-ready routing
- SEO optimized
- Accessibility focused

---

# Project Structure

```
src/

 ├── app/
 ├── components/
 ├── services/
 │    ├── ai/
 │    ├── agents/
 │    └── router/
 ├── lib/
 ├── repositories/
 ├── hooks/
 ├── types/
 └── utils/
```

---

# Getting Started

Clone the repository

```bash
git clone https://github.com/artasyaskar/OpportunityOS-AI.git
```

Install dependencies

```bash
npm install
```

Create

```
.env.local
```

Add

```
Firebase Credentials

Gemini API Key

Groq API Key

OpenRouter API Key
```

Run

```bash
npm run dev
```

---

# Roadmap

Upcoming improvements include

- AI semantic opportunity search
- Live opportunity ingestion pipeline
- Personalized recommendation learning
- Research Knowledge Graph
- AI interview preparation
- Team collaboration
- Browser extension
- Mobile application

---

# Why This Project Matters

Millions of talented students never discover opportunities that could change their lives.

OpportunityOS AI aims to reduce this information gap by combining intelligent discovery, explainable AI, and personalized application assistance into a single platform.

Instead of replacing human decision-making, the platform augments it with transparent recommendations and evidence-backed document generation.

---

# Author

**Artas Yaskar**

Electrical Engineering Student

University of Engineering and Technology Lahore

GitHub

https://github.com/artasyaskar

Portfolio

https://my-portfolio-website-steel-ten.vercel.app

---

## License

This project is released under the MIT License.