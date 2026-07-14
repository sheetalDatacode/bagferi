$path = 'C:\Users\HP\Desktop\appzeto_first\dealing-india\backend\controllers\heroBanner.controller.js'
$content = Get-Content $path -Raw

# Replace the end of confirmPayment with the correct closing braces
# Looking for:
#     res.status(200).json({
#         success: true,
#         message: 'Payment confirmed successfully. Awaiting admin approval.',
#         data: booking
#     });
# });
# And replacing with:
#     res.status(200).json({
#         success: true,
#         message: 'Payment confirmed successfully. Awaiting admin approval.',
#         data: booking
#     });
#   } catch (integrationErr) {
#     console.error('[BannerPay][Critical] Zoho/Email integration helper failed:', integrationErr.message);
#   }
# });

$target = "    res.status(200).json\(\{`r`n        success: true,`r`n        message: 'Payment confirmed successfully. Awaiting admin approval.',`r`n        data: booking`r`n    \}\);`r`n\}\);"
$replacement = "    res.status(200).json({`r`n        success: true,`r`n        message: 'Payment confirmed successfully. Awaiting admin approval.',`r`n        data: booking`r`n    });`r`n  } catch (integrationErr) {`r`n    console.error('[BannerPay][Critical] Zoho/Email integration helper failed:', integrationErr.message);`r`n  }`r`n});"

# Use regex to replace (more robust for whitespace)
$content = $content -replace "res\.status\(200\)\.json\(\{[\s\n\r]*success: true,[\s\n\r]*message: 'Payment confirmed successfully\. Awaiting admin approval\.',[\s\n\r]*data: booking[\s\n\r]*\}\);[\s\n\r]*\}\);", $replacement

# Also fix the amount -> booking.amount global errors
$content = $content -replace "totalAmount: amount", "amount: booking.amount"

Set-Content $path $content -NoNewline
Write-Host "Fixed HeroBanner controller syntax and variable errors."
