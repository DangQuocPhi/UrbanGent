UrbanGent - Responsive Menswear Shopping Website
=================================================

Purpose
-------
UrbanGent is a branded, responsive, multi-page fashion shopping project for
Unit 13: Website Design & Development. It keeps the original HTML5, CSS3,
JavaScript and Bootstrap 5.3.3 technology stack and adds a complete customer
flow from account registration to a size-aware cart, checkout, order and a
choice of cash, card-on-delivery or dynamic VietQR bank transfer.

Pages
-----
1. index.html    - Home, categories, product search/filter and size selection
2. contact.html  - Contact form with JavaScript validation
3. login.html    - Credential-based login and persistent customer session
4. register.html - New customer registration and duplicate-email checking
5. profile.html  - Protected profile editing, loyalty data and owned orders
6. cart.html     - Size-aware cart, quantity controls, delivery and totals
7. checkout.html - Protected delivery, payment choice and order creation
8. order.html    - Protected order details and method-specific instructions

Default customer account
------------------------
Email:    dangquocphi111@gmail.com
Password: Dangquocphi7749@
Role:     customer (not administrator)

Implemented behaviour
---------------------
- Login validates credentials, not only email/password format.
- Passwords are stored as salted SHA-256 hashes rather than plain text.
- Sessions have random tokens and expiration times and survive page refreshes.
- Guest navigation does not show Profile; logged-in navigation does not show
  Login or Register and includes a working Logout action.
- Direct protected-page access redirects a guest to Login.
- New accounts can register, log in, edit their own profile and keep changes
  after a page refresh on the same browser/device.
- Duplicate email addresses are rejected with field-specific feedback.
- Every product requires a valid size before it can enter the cart.
- Product ID, selected size and quantity remain linked through cart, checkout
  and order history.
- Guest cart items are retained and merged into the customer cart at login.
- Orders belong to the current user ID; another signed-in user cannot open them.
- Checkout offers cash, card on delivery and bank transfer. The selected method
  is saved with the order and controls the payment instructions shown next.
- VietQR is generated per order through the official Quick Link format using:
  Bank: MB Bank; BIN: 970422; account: 0916514282; amount: exact order total;
  transfer content: the unique UrbanGent order code.
- No VietQR API key, client secret or token is stored in the repository.

Browser data model
------------------
This educational GitHub Pages build stores users, sessions, per-user carts and
orders in browser localStorage. The data is functional and persists after a
refresh, but it is scoped to that browser profile and does not synchronize
between devices.

This is suitable for demonstrating the complete Unit 13 frontend workflow on
GitHub Pages. It is not production-grade authentication: a public static site
cannot securely enforce authorization against a shared database. A commercial
deployment must replace js/store.js with a server-side/Auth provider adapter,
use HTTPS-only secure cookies or provider sessions, and store users/orders in a
database with row-level ownership rules. Never put a database service key or
VietQR API secret in public JavaScript.

VietQR payment limitation
--------------------------
The dynamic QR contains the correct amount and order content. Quick Link does
not automatically confirm that money arrived, and customers cannot change the
payment status themselves. Automatic confirmation requires a protected backend
webhook/payment provider and must not be implemented with a public secret in
GitHub Pages.

How to run and deploy
---------------------
- Local: serve this folder with any static HTTP server and open index.html.
- GitHub Pages: publish the repository root from the main branch. All internal
  paths are relative, so project-site URLs continue to work.
- Internet access is needed for Bootstrap, Google Fonts and the VietQR image.
- No build step and no environment secret are required for the static demo.

Test account data
-----------------
Email:    dangquocphi111@gmail.com
Password: Dangquocphi7749@
Example new account password: Fashion123
Example Vietnamese phone:     0901 234 567

Photo credits
-------------
Photos are used for this educational prototype under the Unsplash License.

- Hero fashion image:
  https://images.unsplash.com/photo-1516257984-b1b4d707412e
- Cotton shirts by Nimble Made:
  https://unsplash.com/s/photos/shirt-men
- Black trousers styling by Mad Rabbit Tattoo:
  https://unsplash.com/photos/man-in-black-pants-and-black-nike-sneakers-sitting-on-black-metal-railings-YffFiW03cXc
- Dark jacket by Nathan Dumlao:
  https://unsplash.com/photos/man-wearing-black-jacket-SJl7ZfClJEc
- Suede Oxford shoes by Noah Smith:
  https://unsplash.com/photos/brown-leather-shoes-on-blue-textile-1z2hBTKHdWI
