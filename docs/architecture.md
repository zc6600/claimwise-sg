# Decision and History Data Flow

## Decision calculation and persistence

The home estimator and calculator send inputs to `POST /api/decision`, where the decision engine calculates the result. The home estimator waits 500 ms after the latest input change before requesting an estimate. The full calculator requests a decision when the user submits or explicitly chooses to recalculate a saved comparison.

For a signed-in user, the calculator sends the Firebase ID token and asks the route to save the calculation. The route decodes the token UID to choose the user-scoped Firestore document path and forwards the original token to Firestore. Firestore Security Rules authenticate and authorize the write; the route does not independently verify the token signature. The saved record includes the inputs and complete decision result. Guests save records in browser local storage.

## History access and result semantics

History subscriptions and deletes still use the Firebase Web SDK in the browser. The history badge reflects Firestore snapshot metadata, including initial cache state, pending writes, confirmed server state, and fallback to browser storage. Calculation writes use the server route.

Opening a record with a stored decision displays that exact saved result without recalculating it. Legacy records without a full decision load their saved inputs. “Recalculate & save” sends the saved inputs to the current decision engine and saves the new result as a separate comparison.
