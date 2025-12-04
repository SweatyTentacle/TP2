const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const analyzeAnswerWithAI = async (
  questionLabel,
  rule,
  studentAnswer
) => {
  // 1. Vérification de la configuration
  if (!API_KEY) {
    console.error("Clé API OpenAI manquante dans le fichier .env !");
    return {
      status: "Erreur",
      feedback: [
        "La clé API OpenAI n'est pas configurée (VITE_OPENAI_API_KEY).",
      ],
    };
  }

  // 2. Si pas de réponse, échec immédiat (économise l'appel API)
  if (!studentAnswer || studentAnswer.trim().length === 0) {
    return {
      status: "Non conforme",
      feedback: ["Aucune réponse fournie."],
    };
  }

  // 3. Si pas de règle, on considère que c'est bon (ou on demande une précision)
  if (!rule || rule.trim().length === 0) {
    return {
      status: "Conforme",
      feedback: ["Aucune règle spécifique définie pour cette question."],
    };
  }

  // 4. Construction du prompt pour l'IA
  const prompt = `
    Tu es un assistant pédagogique expert chargé de valider des plans de cours.
    
    CONTEXTE:
    - Question : "${questionLabel}"
    - Réponse de l'enseignant : "${studentAnswer}"
    - Règle de validation stricte : "${rule}"

    TÂCHE:
    Analyse si la réponse respecte la règle imposée.
    Sois strict mais constructif.

    FORMAT DE RÉPONSE ATTENDU (JSON pur uniquement):
    {
      "status": "Conforme" ou "À améliorer",
      "feedback": [
        "Phrase courte expliquant le problème (si applicable)",
        "Suggestion concrète pour respecter la règle (si applicable)"
      ]
    }
  `;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Modèle rapide et efficace
        messages: [
          { role: "system", content: "Tu es un validateur JSON strict." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2, // Faible créativité pour une validation constante
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content;

    // Nettoyage de la réponse (au cas où l'IA ajoute des balises markdown)
    const jsonString = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Erreur OpenAI:", error);
    return {
      status: "Erreur",
      feedback: ["Impossible de contacter l'IA pour le moment.", error.message],
    };
  }
};
