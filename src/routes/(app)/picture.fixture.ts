/** A square portrait, as the account platform would serve one, inlined so stories and tests stay offline. */
export const portraitPicture = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f6f73"/><stop offset="1" stop-color="#26315f"/></linearGradient></defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <circle cx="128" cy="104" r="46" fill="#f2c9a0"/>
  <path d="M40 256c8-58 44-86 88-86s80 28 88 86z" fill="#e0794f"/>
  <path d="M82 96c0-34 22-52 46-52s46 18 46 52c-10-16-26-22-46-22s-36 6-46 22z" fill="#3a2a22"/></svg>`
)}`;
