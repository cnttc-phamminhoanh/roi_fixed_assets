// =========================================
// LOGIN PAGE
// =========================================

document.addEventListener('DOMContentLoaded', async () => {

    const loginForm = document.getElementById('loginForm');
    const empNoInput = document.getElementById('empNo');
    const passwordInput = document.getElementById('password');

    const loginButton = document.getElementById('loginButton');
    const loginButtonText = document.getElementById('loginButtonText');
    const loginLoading = document.getElementById('loginLoading');

    const loginError = document.getElementById('loginError');

    const togglePassword =
        document.getElementById('togglePassword');

    const backButton =
        document.getElementById('backButton');


    // =========================================
    // GET RETURN URL
    // =========================================

    const params = new URLSearchParams(window.location.search);

    let returnUrl = params.get('returnUrl');


    // Chỉ cho phép redirect về trang nội bộ
    if (
        !returnUrl ||
        !returnUrl.startsWith('/') ||
        returnUrl.startsWith('//')
    ) {
        returnUrl = '/roifixedassets.html';
    }


    // =========================================
    // CHECK CURRENT LOGIN
    // =========================================

    try {

        const response = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.loggedIn) {

            window.location.href = returnUrl;

            return;
        }

    } catch (error) {

        console.error(
            'Cannot check login status:',
            error
        );
    }


    // =========================================
    // FOCUS EMPLOYEE ID
    // =========================================

    empNoInput.focus();


    // =========================================
    // TOGGLE PASSWORD
    // =========================================

    togglePassword.addEventListener(
        'click',
        () => {

            const isPassword =
                passwordInput.type === 'password';

            passwordInput.type =
                isPassword
                    ? 'text'
                    : 'password';

            togglePassword.textContent =
                isPassword
                    ? '🙈'
                    : '👁';

            togglePassword.setAttribute(
                'aria-label',
                isPassword
                    ? 'Hide password'
                    : 'Show password'
            );
        }
    );


    // =========================================
    // CLEAR ERROR
    // =========================================

    function clearError() {

        loginError.textContent = '';

        loginError.style.display = 'none';
    }


    // =========================================
    // SHOW ERROR
    // =========================================

    function showError(message) {

        loginError.textContent = message;

        loginError.style.display = 'block';
    }


    // =========================================
    // LOADING STATE
    // =========================================

    function setLoading(isLoading) {

        loginButton.disabled = isLoading;

        if (isLoading) {

            loginButtonText.style.display =
                'none';

            loginLoading.style.display =
                'inline';

        } else {

            loginButtonText.style.display =
                'inline';

            loginLoading.style.display =
                'none';
        }
    }


    // =========================================
    // LOGIN
    // =========================================

    loginForm.addEventListener(
        'submit',
        async (event) => {

            event.preventDefault();

            clearError();


            const empNo =
                empNoInput.value.trim();

            const password =
                passwordInput.value;


            // =====================================
            // VALIDATION
            // =====================================

            if (!empNo) {

                showError(
                    'Please enter your Employee ID.'
                );

                empNoInput.focus();

                return;
            }

            if (!password) {

                showError(
                    'Please enter your password.'
                );

                passwordInput.focus();

                return;
            }


            setLoading(true);


            try {

                const response = await fetch(
                    '/api/login',
                    {
                        method: 'POST',

                        credentials: 'include',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            empNo: empNo,
                            password: password
                        })
                    }
                );


                let result = null;

                try {

                    result =
                        await response.json();

                } catch (jsonError) {

                    result = null;
                }


                // =================================
                // LOGIN SUCCESS
                // =================================

                if (
                    response.ok &&
                    result &&
                    result.success
                ) {

                    // Chờ session cookie được lưu
                    window.location.href =
                        returnUrl;

                    return;
                }


                // =================================
                // LOGIN FAILED
                // =================================

                if (
                    response.status === 401
                ) {

                    showError(
                        'Employee ID or password is incorrect.'
                    );

                } else if (
                    response.status === 400
                ) {

                    showError(
                        result?.message ||
                        'Please enter Employee ID and password.'
                    );

                } else {

                    showError(
                        result?.message ||
                        'Login failed. Please try again.'
                    );
                }


            } catch (error) {

                console.error(
                    'Login error:',
                    error
                );

                showError(
                    'Unable to connect to the server. Please try again.'
                );

            } finally {

                setLoading(false);
            }

        }
    );


    // =========================================
    // BACK TO DASHBOARD
    // =========================================

    backButton.addEventListener(
        'click',
        () => {

            window.location.href =
                '/roifixedassets.html';
        }
    );

});


function goToLogin() {

    const returnUrl =
        '/roifixedassets.html';

    window.location.href =
        '/login/login.html?returnUrl=' +
        encodeURIComponent(returnUrl);
}