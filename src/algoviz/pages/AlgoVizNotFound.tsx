import { ArrowLeft, SearchX } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useT } from "../preferences";

// Unknown paths get a real not-found page instead of an empty shell.
export default function AlgoVizNotFound() {
  const t = useT();
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found · AlgoViz";
    return () => { document.title = previousTitle; };
  }, []);
  return <div className="algoviz-page algoviz-module-page">
    <section className="algoviz-module-hero">
      <Link className="algoviz-back-link" to="/"><ArrowLeft size={16} /> {t("Back to Learn")}</Link>
      <span className="algoviz-module-icon" aria-hidden="true"><SearchX size={28} /></span>
      <p className="algoviz-eyebrow">404</p>
      <h1>{t("Page not found")}</h1>
      <p className="algoviz-module-lede">{t("That AlgoViz page does not exist. Choose a lab from the menu above.")}</p>
    </section>
  </div>;
}