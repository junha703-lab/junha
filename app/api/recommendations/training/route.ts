import { NextResponse } from "next/server";

import {
  competencyRecommendations,
  contextErrorStatus,
  findLiveTrainingRecommendations,
  isPeriod,
  isSessionToken,
  loadRecommendationContext,
  saveRecommendations,
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

    // Training availability changes often. The helper keeps a short server cache,
    // while each response is refreshed from the public TETI course list so that a
    // saved, closed course is never presented as the current recommendation.
    const recommendations = await findLiveTrainingRecommendations(
      context.weakest_dimension,
    );
    if (recommendations.length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_LIVE_TETI_COURSES" },
        { status: 503 },
      );
    }

    const saved = await saveRecommendations(
      body.sessionToken,
      context,
      "training",
      recommendations,
    );
    if (!saved.success) throw new Error(saved.error ?? "SAVE_FAILED");

    const config = competencyRecommendations[context.weakest_dimension];
    return NextResponse.json({
      success: true,
      source: "teti-live-courses",
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
