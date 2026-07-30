import { NextResponse } from "next/server";

import {
  competencyRecommendations,
  contextErrorStatus,
  isPeriod,
  isSessionToken,
  loadRecommendationContext,
  makeTrainingRecommendations,
  saveRecommendations,
  type TrainingRecommendation,
} from "../../../../lib/growth-recommendations";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionToken?: unknown;
      period?: unknown;
    };

    if (!isSessionToken(body.sessionToken) || !isPeriod(body.period)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT" },
        { status: 400 },
      );
    }

    const context = await loadRecommendationContext(
      body.sessionToken,
      body.period,
    );
    if (
      !context.success ||
      !context.weakest_dimension ||
      context.weakest_score === undefined
    ) {
      return NextResponse.json(context, {
        status: contextErrorStatus(context.error),
      });
    }

    const cached = context.cached_training;
    const recommendations: TrainingRecommendation[] =
      Array.isArray(cached) && cached.length > 0
        ? cached.slice(0, 3)
        : makeTrainingRecommendations(context.weakest_dimension);

    if (!cached?.length) {
      const saved = await saveRecommendations(
        body.sessionToken,
        context,
        "training",
        recommendations,
      );
      if (!saved.success) throw new Error(saved.error ?? "SAVE_FAILED");
    }

    const config = competencyRecommendations[context.weakest_dimension];
    return NextResponse.json({
      success: true,
      source: cached?.length ? "history" : "generated-keywords",
      weakestDimension: context.weakest_dimension,
      weakestLabel: config.label,
      weakestScore: context.weakest_score,
      diagnosis: config.diagnosis,
      recommendations,
    });
  } catch (error) {
    console.error("Training recommendation failed", error);
    return NextResponse.json(
      { success: false, error: "TRAINING_RECOMMENDATION_FAILED" },
      { status: 500 },
    );
  }
}
