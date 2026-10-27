<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Game rules live as pure functions in src/game/logic.ts (tested in src/test/logic.test.ts); UI in src/components/game. Why: keeps rules testable and separate from rendering.
- Player data (settings, scores) is stored on-device in localStorage via src/game/storage.ts, no backend. Why: game must work offline inside the Android app.
- Android packaging uses Capacitor with webDir `www`, produced by scripts/build-android.sh (builds, then renders `/` from the server bundle into www/index.html). Why: Capacitor needs static files; the default build targets a worker.
