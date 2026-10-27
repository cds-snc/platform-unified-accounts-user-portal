import Link from "next/link";

import { PolicySection } from "./PolicySection";

export function PrivacyPolicyContentFr() {
  return (
    <article className="space-y-6">
      <p>
        FR - The Single Sign-On website is a product of the{" "}
        <a href="https://numerique.canada.ca/" target="_blank" rel="noopener noreferrer">
          Canadian Digital Service
        </a>{" "}
        (CDS), part of{" "}
        <a
          href="https://www.canada.ca/fr/emploi-developpement-social.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Employment and Social Development Canada
        </a>
        . Each CDS product and the{" "}
        <a
          href="https://numerique.canada.ca/juridique/confidentialite/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CDS website
        </a>{" "}
        has its own privacy notice.
      </p>
      <p>
        FR - Single Sign-On lets Government of Canada employees use one login to access CDS
        products, such as GC Forms.
      </p>

      <PolicySection title="We collect your personal information">
        <p>
          FR - We use your contact information to communicate with you about Single Sign-On and CDS
          products.
        </p>
        <p>FR - We collect your name, work contact information, as well as your feedback.</p>
        <p>
          FR - If you contact us or create an account, we use your information to reply or confirm
          that you’re authorized to use CDS products, or provide you with information and support.
        </p>
        <p>
          FR - We also log Internet Protocol (IP) addresses. The IP address identifies the location
          and the internet/network provider of the computer or mobile device that you use to visit
          Single Sign-On. We use the IP logs to monitor Single Sign-On’s network and security. We do
          not link these logs with your name or email address.
        </p>
        <p>
          FR - Passwords and answers to your security questions are hashed before being stored.
          Hashing ensures that passwords and answers cannot be deciphered or reconstructed, even by
          CDS employees.
        </p>
        <p>
          FR - We’ll deactivate your account at your request. You can request your account be
          deactivated by using the{" "}
          <Link href="/contact-us" prefetch={false}>
            ‘contact us’
          </Link>{" "}
          page. Your email address stays in our archives for two weeks after your account is
          deactivated. For details on where and how we store your information, visit Single
          Sign-On’s Security Statement.
        </p>
        <p className="font-semibold">
          FR - We use your information to improve Single Sign-On and CDS products, and to report on
          their impact
        </p>
        <p>
          FR - Your information can improve Single Sign-On and CDS products. We may use information
          on how you use Single Sign-On to learn what could be added or changed to improve your
          experience. We use third-party software tools to analyze this data. We may also use your
          contact information to invite you to participate in our research.
        </p>
      </PolicySection>

      <PolicySection title="We use web analytics and may use artificial intelligence (AI)">
        <p>
          FR - Analytics show how people use our websites. By studying how people navigate, we can
          improve Single Sign-On.
        </p>
        <p>FR - We use Google Analytics for information about:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Pages people visit and the links they select.</li>
          <li>Types of operating systems and browsers that visit Single Sign-On.</li>
          <li>Approximate location, if enabled on the browser.</li>
          <li>Date and time of visits.</li>
        </ul>
        <p>
          FR - We do not use analytics to collect information that could identify you or your
          location.
        </p>
        <p>
          FR - We may also use AI to analyze feedback and support requests. When using AI, we remove
          any information that could identify you, such as your name and email address.
        </p>
        <p>
          FR - The{" "}
          <a
            href="https://laws-lois.justice.gc.ca/fra/lois/h-5.7/TexteComplet.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Department of Employment and Social Development Act
          </a>{" "}
          Section 5.1 allows us to collect this information. You can read more about this in the
          Standard Personal Information Bank{" "}
          <a
            href="https://www.canada.ca/fr/secretariat-conseil-tresor/services/acces-information-protection-renseignements-personnels/acces-information/renseignements-programmes-fonds-renseignements/fichiers-renseignements-personnels-ordinaires.html#psu915"
            target="_blank"
            rel="noopener noreferrer"
          >
            PSU 915
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection title="We share some information">
        <p>
          FR - We may share general use case information about Single Sign-On in public forums, such
          as blog posts, presentations, and conferences.
        </p>
        <p>
          FR - If you use other CDS products, we may share information with those services to
          improve your experience.
        </p>
        <p>
          FR - We use technology and services from other organizations. For example, to prevent
          digital attacks, we share information on when and how you use Single Sign-On with the{" "}
          <a href="https://cyber.gc.ca/fr" target="_blank" rel="noopener noreferrer">
            Canadian Centre for Cyber Security
          </a>{" "}
          (CCCS).
        </p>
        <p>
          FR - We also use open source software and services from the private sector. For the list
          of services, both public and private, visit Other services used by Single Sign-On.
        </p>
        <p>FR - We do not:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Authorize other services to use your information for anything unrelated to Single
            Sign-On and any CDS products you have registered for.
          </li>
          <li>Sell or rent your personal information.</li>
          <li>Share your personal information for marketing purposes.</li>
        </ul>
        <p>FR - We may share information with law enforcement by court order.</p>
      </PolicySection>

      <PolicySection title="We protect your privacy">
        <p>
          FR - We handle your information under Part 4 of the{" "}
          <a
            href="https://laws-lois.justice.gc.ca/fra/lois/h-5.7/TexteComplet.html#h-256161"
            target="_blank"
            rel="noopener noreferrer"
          >
            Department of Employment and Social Development Act
          </a>
          , the{" "}
          <a
            href="https://laws-lois.justice.gc.ca/fra/lois/a-1/page-1.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Access to Information Act
          </a>
          , and the{" "}
          <a
            href="https://laws-lois.justice.gc.ca/fra/lois/P-21/index.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Act
          </a>
          .
        </p>
        <p>
          FR - We also follow Appendix E: Standard on Privacy in Web Analytics of the{" "}
          <a
            href="https://www.tbs-sct.canada.ca/pol/doc-fra.aspx?id=18309"
            target="_blank"
            rel="noopener noreferrer"
          >
            Directive on Privacy Practices
          </a>
          . To learn how we use technology to protect information, visit Single Sign-On’s Security
          Statement.
        </p>
      </PolicySection>

      <PolicySection title="You have privacy rights">
        <p>
          FR - The law requires that we protect your privacy. You have the right to access and
          review your personal information. Use your Single Sign-On account to check, correct, or
          update your information.
        </p>
        <p>
          FR - You also have the right to raise concerns about how we handle your personal
          information. To learn more or to make a formal complaint, contact the{" "}
          <a
            href="https://www.priv.gc.ca/fr/pour-les-particuliers/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Commissioner of Canada
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection title="Questions?">
        <p>
          FR -{" "}
          <Link href="/contact-us" prefetch={false}>
            Contact us.
          </Link>
        </p>
      </PolicySection>
    </article>
  );
}
