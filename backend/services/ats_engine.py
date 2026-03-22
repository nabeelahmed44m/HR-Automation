try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

from datetime import datetime
import re
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class ATSEngine:
    def __init__(self):
        self.nlp = None
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except Exception:
                logger.warning("Spacy model not found. Proceeding with fallback mode.")

    def extract_keywords(self, text: str) -> set:
        if not text: return set()
        
        # Priority 1: Use Spacy if available
        if self.nlp:
            try:
                doc = self.nlp(text.lower())
                keywords = set()
                for token in doc:
                    if token.pos_ in ["NOUN", "PROPN"] and not token.is_stop and len(token.text) > 2:
                        keywords.add(token.text)
                return keywords
            except Exception as e:
                logger.error(f"Spacy error: {e}. Falling back...")

        # Priority 2: Robust Regex Fallback (Works even without spacy)
        words = re.findall(r'\b\w\w\w+\b', text.lower())
        # Filter common stopwords (simplified list)
        stopwords = {"this", "that", "with", "from", "your", "they", "them", "their", "will", "have", "were", "been"}
        return set([w for w in words if w not in stopwords])

    def extract_experience_years(self, text: str) -> float:
        if not text: return 0.0
        
        text_lower = text.lower()
        total_years = 0.0
        
        # 1. Advanced Date Range Detection (e.g. March 2023 - June 2025 or June 2025 - Present)
        months_map = {
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
        }
        
        # Pattern for "Month Year - Month Year/Present"
        date_pattern = r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}|\d{4})\s*[\-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}|\d{4}|present|current)'
        
        def parse_date_to_months(date_str):
            date_str = date_str.strip()
            if date_str in ["present", "current"]:
                now = datetime.now()
                return now.year * 12 + now.month
            
            # Match Month Year
            m_match = re.search(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})', date_str)
            if m_match:
                month = months_map[m_match.group(1)[:3]]
                year = int(m_match.group(2))
                return year * 12 + month
            
            # Match Year only
            y_match = re.search(r'(\d{4})', date_str)
            if y_match:
                return int(y_match.group(1)) * 12 + 1
            return None

        matches = re.finditer(date_pattern, text_lower)
        found_ranges = False
        for match in matches:
            start_m = parse_date_to_months(match.group(1))
            end_m = parse_date_to_months(match.group(2))
            if start_m and end_m:
                total_years += (end_m - start_m) / 12.0
                found_ranges = True
        
        if found_ranges:
            return round(max(total_years, 0.0), 1)

        # 2. Simple Regex Fallback (e.g. "5 years experience")
        patterns = [
            r"(\d+)\+?\s*years?",
            r"(one|two|three|four|five|six|seven|eight|nine|ten)\s*years?"
        ]
        
        max_simple_years = 0
        for pattern in patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                val = match.group(1)
                if val.isdigit():
                    max_simple_years = max(max_simple_years, int(val))
                else:
                    word_to_num = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
                    max_simple_years = max(max_simple_years, word_to_num.get(val, 0))
        
        return float(max_simple_years)

    def extract_education(self, text: str) -> List[str]:
        if not text: return []
        edu_keywords = ["bachelor of science", "master of science", "bachelor", "master", "phd", "degree", "bs", "ms", "computer science", "engineering", "mba", "university", "college"]
        # Sort keywords by length to find longest (most specific) matches first
        edu_keywords.sort(key=len, reverse=True)
        
        found = []
        text_lower = text.lower()
        for k in edu_keywords:
            if re.search(fr'\b{re.escape(k)}\b', text_lower):
                # Avoid adding "bachelor" if we already found "bachelor of science"
                if not any(k in f for f in found):
                    found.append(k)
        return found

    def calculate_score(self, job_data: dict, resume_text: str) -> Dict[str, Any]:
        # weights
        w_skill = float(job_data.get("skill_weight", 40))
        w_exp = float(job_data.get("experience_weight", 30))
        w_edu = float(job_data.get("education_weight", 10))
        w_density = float(job_data.get("keyword_weight", 20))
        
        # 1. Skill Match (40%)
        jd_text = (job_data.get("description", "") + " " + job_data.get("requirements", "")).lower()
        jd_keywords = self.extract_keywords(jd_text)
        res_keywords = self.extract_keywords(resume_text)
        
        matched_skills = jd_keywords.intersection(res_keywords)
        missing_skills = list(jd_keywords.difference(res_keywords))[:10] # Show top missing
        
        skill_match_percent = (len(matched_skills) / len(jd_keywords)) * 100 if jd_keywords else 100
        
        # 2. Experience Match (30%)
        # Extract target exp from JD (prioritize experience_level field, fallback to requirements)
        jd_exp_req = self.extract_experience_years(job_data.get("experience_level", "0"))
        if jd_exp_req == 0:
            # Try searching the requirements/description for mentions like "3+ years"
            jd_exp_req = self.extract_experience_years(job_data.get("requirements", "") + " " + job_data.get("description", ""))
            
        res_exp = self.extract_experience_years(resume_text)
        
        if jd_exp_req == 0:
            exp_score = 100
        else:
            exp_score = min(100, (res_exp / jd_exp_req) * 100)
            
        # 3. Education Match (10%)
        jd_edu = self.extract_education(jd_text)
        res_edu = self.extract_education(resume_text)
        
        if not jd_edu:
            edu_score = 100
        else:
            matches = [e for e in jd_edu if e in res_edu]
            edu_score = (len(matches) / len(jd_edu)) * 100
            
        # 4. Keyword Density (20%)
        # Count occurrences of JD keywords in resume
        total_occurrences = 0
        resume_lower = resume_text.lower()
        for k in jd_keywords:
            total_occurrences += resume_lower.count(k)
            
        # Density score relative to JD word count
        jd_word_count = len(jd_text.split())
        density = (total_occurrences / jd_word_count) * 100 if jd_word_count > 0 else 0
        density_score = min(100, density * 5) # Scale factor
        
        # Aggregate
        final_score = (
            (skill_match_percent * (w_skill / 100)) +
            (exp_score * (w_exp / 100)) +
            (edu_score * (w_edu / 100)) +
            (density_score * (w_density / 100))
        )
        
        explanation = {
            "matched_skills": list(matched_skills)[:15],
            "missing_skills": missing_skills,
            "experience_detected": f"{res_exp} years (Required: {job_data.get('experience_level', 'Any')} years)",
            "education_detected": res_edu,
            "breakdown": {
                "skill_score": round(skill_match_percent, 1),
                "experience_score": round(exp_score, 1),
                "education_score": round(edu_score, 1),
                "density_score": round(density_score, 1)
            }
        }
        
        return {
            "score": round(final_score, 1),
            "explanation": explanation
        }
