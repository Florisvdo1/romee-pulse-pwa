# Pulse Planner · Romee

Een responsive, fullscreen one-page PWA in Pulse-stijl. Cartoon UI, premium animaties, en offline/installeerbaar op Android (Chrome).

## Deploy op GitHub Pages
1. Maak een **publieke** repository aan, bijvoorbeeld `romee-pulse-pwa`.
2. Upload **alle bestanden** uit deze map (inclusief `icons/`) naar de root van je repo.
3. Ga naar **Settings → Pages**, kies **Deploy from Branch** en selecteer de `main` branch, `/root`.
4. Wacht tot Pages klaar is en open de URL zoals `https://<username>.github.io/romee-pulse-pwa/`.

> Opmerking: de service worker gebruikt relatieve paden en werkt binnen submappen, dus ook met `/<repo>/` scope.

## PWA Tip
Bij de eerste load worden CDN-dependencies in de cache gezet. Daarna werkt de app offline. De **Installeren**-chip verschijnt vanzelf als Chrome de PWA klaar vindt voor installatie.

## Stack
- React 18 (ESM via `esm.sh`), Tailwind (CDN), Framer Motion, Lucide iconen
- shadcn/ui-achtige componenten, custom glaslagen en animaties
- localStorage-persistentie (notities + toggles)
