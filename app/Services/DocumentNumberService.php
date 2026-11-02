<?php

namespace App\Services;

use App\Models\CreditDebitNote;
use App\Models\Sale;
use App\Models\Voucher;
use Carbon\Carbon;

class DocumentNumberService
{
    /**
     * Get 4-digit financial year code (e.g., '2627' for April 1, 2026 to March 31, 2027)
     */
    public static function getFinancialYearCode(?Carbon $date = null): string
    {
        $now = $date ?: Carbon::now();
        $year = (int) $now->format('Y');
        $month = (int) $now->format('n');

        // Indian Financial Year: April 1 to March 31
        if ($month >= 4) {
            $startYear = $year % 100;
            $endYear = ($year + 1) % 100;
        } else {
            $startYear = ($year - 1) % 100;
            $endYear = $year % 100;
        }

        return sprintf('%02d%02d', $startYear, $endYear);
    }

    /**
     * Generate next sequential invoice number for the financial year (e.g. INV/2627/0001)
     * Resets only at the end of the financial year (March 31 / April 1), NOT at month end.
     */
    public static function generateInvoiceNo(int $tenantId, ?Carbon $date = null): string
    {
        $fyCode = self::getFinancialYearCode($date);
        $prefix = "INV/{$fyCode}/";

        // Query the latest invoice in this financial year
        $lastRecord = Sale::where('tenant_id', $tenantId)
            ->where('invoice_no', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->first();

        $nextSeq = 1;
        if ($lastRecord && preg_match('/\/(\d+)$/', $lastRecord->invoice_no, $matches)) {
            $nextSeq = intval($matches[1]) + 1;
        }

        $number = sprintf('%s%04d', $prefix, $nextSeq);
        while (Sale::where('tenant_id', $tenantId)->where('invoice_no', $number)->exists()) {
            $nextSeq++;
            $number = sprintf('%s%04d', $prefix, $nextSeq);
        }

        return $number;
    }

    /**
     * Generate next sequential Credit Note or Debit Note number for the financial year
     * Credit Note: CN/2627/0001
     * Debit Note:  DN/2627/0001
     * Resets only at the end of the financial year, NOT at month end.
     */
    public static function generateNoteNo(int $tenantId, string $type, ?Carbon $date = null): string
    {
        $fyCode = self::getFinancialYearCode($date);
        $typePrefix = ($type === 'credit_note') ? 'CN' : 'DN';
        $prefix = "{$typePrefix}/{$fyCode}/";

        $lastRecord = CreditDebitNote::where('tenant_id', $tenantId)
            ->where('type', $type)
            ->where('note_no', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->first();

        $nextSeq = 1;
        if ($lastRecord && preg_match('/\/(\d+)$/', $lastRecord->note_no, $matches)) {
            $nextSeq = intval($matches[1]) + 1;
        }

        $number = sprintf('%s%04d', $prefix, $nextSeq);
        while (CreditDebitNote::where('tenant_id', $tenantId)->where('note_no', $number)->exists()) {
            $nextSeq++;
            $number = sprintf('%s%04d', $prefix, $nextSeq);
        }

        return $number;
    }

    /**
     * Generate next sequential Voucher number for the financial year
     * Receipt Voucher: RV/2627/0001
     * Payment Voucher: PV/2627/0001
     * Resets only at the end of the financial year, NOT at month end.
     */
    public static function generateVoucherNo(int $tenantId, string $type, ?Carbon $date = null): string
    {
        $fyCode = self::getFinancialYearCode($date);
        $typePrefix = ($type === 'receipt') ? 'RV' : 'PV';
        $prefix = "{$typePrefix}/{$fyCode}/";

        $lastRecord = Voucher::where('tenant_id', $tenantId)
            ->where('type', $type)
            ->where('voucher_no', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->first();

        $nextSeq = 1;
        if ($lastRecord && preg_match('/\/(\d+)$/', $lastRecord->voucher_no, $matches)) {
            $nextSeq = intval($matches[1]) + 1;
        }

        $number = sprintf('%s%04d', $prefix, $nextSeq);
        while (Voucher::where('tenant_id', $tenantId)->where('voucher_no', $number)->exists()) {
            $nextSeq++;
            $number = sprintf('%s%04d', $prefix, $nextSeq);
        }

        return $number;
    }
}

