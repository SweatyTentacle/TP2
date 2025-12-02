const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const analyzeAnswerWithAI = async (
  questionLabel,
  rule,
  studentAnswer
) => {
  if (!API_KEY) {
    console.error("Clé API OpenAI manquante !");
    return {
      status: "Erreur",
      feedback: ["Configuration manquante : Clé API non trouvée."],
    };
  }

  // Si la réponse est vide, pas besoin de payer l'IA
  if (!studentAnswer || studentAnswer.trim().length === 0) {
    return {
      status: "Non conforme",
      feedback: ["Aucune réponse fournie."],
    };
  }

  const prompt = `
    Tu es un assistant pédagogique expert.
    Voici une question de plan de cours : "${questionLabel}"
    Voici la règle de validation imposée par le coordonnateur : "${rule}"
    Voici la réponse de l'enseignant : "${studentAnswer}"

    Analyse si la réponse respecte la règle.
    Réponds UNIQUEMENT au format JSON strict suivant, sans texte avant ni après :
    {
      "status": "Conforme" | "À améliorer" | "Non conforme",
      "feedback": ["point positif 1", "suggestion d'amélioration 1", "erreur 1"]
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
        model: "gpt-3.5-turbo", // ou "gpt-4o-mini" (moins cher et rapide)
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, // Faible température pour des réponses plus constantes
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content;

    // Nettoyage pour s'assurer qu'on a bien que du JSON (parfois l'IA ajoute des ```json ... ```)
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
