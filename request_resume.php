<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/PHPMailer.php';
require 'PHPMailer/SMTP.php';
require 'PHPMailer/Exception.php';

$email = $_POST['email'] ?? '';

// Load existing requests
$requestsFile = 'data/requests.json';
$existing = file_exists($requestsFile) ? json_decode(file_get_contents($requestsFile), true) : [];

$emailExists = false;
foreach ($existing as $req) {
    if (strtolower($req['email']) === strtolower($email)) {
        $emailExists = true;
        break;
    }
}

if ($emailExists) {
    echo "<script>alert('You already sent your email. Please wait for the confirmation.'); window.history.back();</script>";
    exit;
}

// Save new request
$request = [
    "email" => $email,
    "timestamp" => date("Y-m-d H:i:s"),
    "status" => "pending"
];
$existing[] = $request;
file_put_contents($requestsFile, json_encode($existing, JSON_PRETTY_PRINT));

// Send email to admin
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = '20ronel22@gmail.com';
    $mail->Password = 'pkcoxfjxegwrmxen';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom('20ronel22@gmail.com', 'Resume System');
    $mail->addAddress('20ronel22@gmail.com');

    $mail->isHTML(true);
    $mail->Subject = 'New Resume Request';
    $mail->Body = "<strong>New resume request from:</strong> $email<br><em>Timestamp:</em> {$request['timestamp']}";

    $mail->send();
    echo "<script>alert('Request sent! The admin will review your request soon.'); window.history.back();</script>";
} catch (Exception $e) {
    echo "<script>alert('Message could not be sent. Mailer Error: {$mail->ErrorInfo}'); window.history.back();</script>";
}
?>
