import {
  isOrganizer,
  organizerConfigured,
  organizerCookie,
  verifyOrganizerKey,
} from '@/lib/organizer-auth';
import { readTournament, writeTournament } from '@/lib/storage';
import { applyAction } from '@/lib/tournament';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export async function GET() {
  try {
    const [state, organizer] = await Promise.all([readTournament(), isOrganizer()]);
    return reply({
      ...state,
      isOrganizer: organizer,
      needsSetup: !organizer,
      signedIn: true,
      organizerConfigured: organizerConfigured(),
    });
  } catch {
    return reply({ error: 'Não foi possível carregar o torneio. Tente novamente.' }, 503);
  }
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) {
      return reply({ error: 'Origem não autorizada.' }, 403);
    }

    if (!req.headers.get('content-type')?.includes('application/json')) {
      return reply({ error: 'Formato inválido.' }, 415);
    }

    const text = await req.text();
    if (text.length > 12000) {
      return reply({ error: 'Solicitação muito grande.' }, 413);
    }

    const action = JSON.parse(text);

    if (action.type === 'claim') {
      if (!organizerConfigured()) {
        return reply({ error: 'Área do organizador ainda não foi configurada no Vercel.' }, 503);
      }
      if (
        typeof action.key !== 'string' ||
        action.key.length < 8 ||
        action.key.length > 100 ||
        !verifyOrganizerKey(action.key)
      ) {
        return reply({ error: 'Chave de organização inválida.' }, 403);
      }

      const response = reply({ ok: true });
      response.headers.append('Set-Cookie', organizerCookie());
      return response;
    }

    if (!(await isOrganizer())) {
      return reply({ error: 'Somente o organizador pode alterar o torneio.' }, 403);
    }

    const state = await readTournament();
    if (action.version !== state.version) {
      return reply({ error: 'O torneio mudou em outra janela. Atualize antes de salvar.' }, 409);
    }

    const next = applyAction(state.tournament, action);
    const changed = await writeTournament(next, state.version);

    if (!changed) {
      return reply({ error: 'Outra alteração foi salva. Atualize e tente novamente.' }, 409);
    }

    return reply({ ok: true });
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : 'Não foi possível salvar.' },
      400,
    );
  }
}
